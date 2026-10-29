// Generates an additive seed from the original local fixtures. Execute only against
// the current Draftbit Development connection. No credentials or production URLs.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const ts = require("typescript");
const root = path.join(__dirname, "..");
const cache = new Map();
function load(relative) {
  if (relative.endsWith("demoProfilePhotos.ts")) return { demoContactPhotoPath: () => null };
  const file = path.join(root, relative);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  if (source.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error)) throw Error(`Invalid fixture: ${relative}`);
  vm.runInNewContext(source.outputText, {
    module, exports: module.exports, Date, Intl: globalThis.Intl,
    require: name => load(path.relative(root, path.resolve(path.dirname(file), name + ".ts"))),
  }, { filename: file });
  return module.exports;
}
const uuid = key => {
  const hash = crypto.createHash("sha256").update("lady-j-development-demo:" + key).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};
const fixture = load("lib/salon/demo.ts");
const commerce = load("lib/salon/ownerDemo.ts");
const vendorSource = fs.readFileSync(path.join(root, "components/salon/owner/VendorSpendingPanel.tsx"), "utf8");
const vendorAst = ts.createSourceFile("vendors.tsx", vendorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const vendorNames = ["demoVendorNames", "demoVendors", "demoProducts", "dateAgo", "demoVendorPurchases"];
const vendorCode = vendorAst.statements.filter(s => ts.isVariableStatement(s) && s.declarationList.declarations.some(d => vendorNames.includes(d.name.getText(vendorAst)))).map(s => s.getText(vendorAst)).join("\n");
const vendors = vm.runInNewContext(ts.transpileModule(vendorCode + "\n;({demoVendors,demoVendorPurchases})", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { Date });
const backbarSource = fs.readFileSync(path.join(root, "components/salon/owner/BackbarPanel.tsx"), "utf8");
const backbarAst = ts.createSourceFile("backbar.tsx", backbarSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let backbarExpression;
function findBackbar(node) {
  if (ts.isCallExpression(node) && node.expression.getText(backbarAst) === "setItems" && ts.isCallExpression(node.arguments[0]) && ts.isPropertyAccessExpression(node.arguments[0].expression) && ts.isArrayLiteralExpression(node.arguments[0].expression.expression)) backbarExpression = node.arguments[0].getText(backbarAst);
  ts.forEachChild(node, findBackbar);
}
findBackbar(backbarAst);
if (!backbarExpression) throw Error("Original Backbar fixture not found.");
const backbar = vm.runInNewContext(ts.transpileModule("const value = " + backbarExpression + "; value;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {});
const blocks = load("lib/salon/ownerCalendarDemo.ts").createOwnerCalendarDemo(new globalThis.Intl.DateTimeFormat("en-CA", { timeZone: "America/Port_of_Spain" }).format(new Date()));
const payload = {
  clients: fixture.demoClients.map(c => ({ ...c, id: uuid(c.id) })),
  appointments: [...fixture.demoAppointments, ...blocks].map(a => ({
    ...a, id: uuid(a.id), source_key: a.id,
    client_id: a.kind === "block" ? null : uuid(a.client_id || a.customer_id),
  })),
  transactions: fixture.demoTransactions.map(t => ({ ...t, id: uuid(t.id), appointment_id: uuid(t.appointment_id) })),
  vendors: vendors.demoVendors.map(v => ({ ...v, id: uuid(v.id) })),
  vendor_purchases: vendors.demoVendorPurchases.map(p => ({ ...p, id: uuid(p.id), vendor_id: uuid(p.vendor_id) })),
  discounts: commerce.ownerDemoDiscounts.map(d => ({ ...d, id: uuid(d.id) })),
  promotions: commerce.ownerDemoPromotions.map(p => ({ ...p, id: uuid(p.id) })),
  backbar: backbar.map(i => ({ ...i, id: uuid(i.id) })),
};
const sql = `
do $seed$
declare
  owner_id uuid; owner_client uuid; item jsonb; person jsonb; service_record record;
  payload jsonb := $dataset$${JSON.stringify(payload)}$dataset$::jsonb;
  cid uuid; aid uuid; vid uuid; purchase_id uuid; sample_id uuid; offset_day integer; sample_day date;
begin
  select user_id into owner_id from public.lj_test_owner_access limit 1;
  if owner_id is null then raise exception 'Development Test Owner is required; seed must never run in production.'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  select id into owner_client from public.lj_client_records where customer_id=owner_id and deleted_at is null limit 1;
  if owner_client is null then raise exception 'Development Test Owner client profile is required.'; end if;
  for person in select value from jsonb_array_elements(payload->'clients') loop
    insert into public.lj_client_records(id,first_name,last_name,full_name,email,phone,birthday,is_minor,guardian_name,guardian_relationship,guardian_phone,preferences,sensitivities,private_notes)
    values((person->>'id')::uuid,person->>'first_name',person->>'last_name',person->>'full_name',person->>'email',person->>'phone',(person->>'birthday')::date,(person->>'is_minor')::boolean,coalesce(person->>'guardian_name',''),case when (person->>'is_minor')::boolean then 'Parent' else '' end,case when (person->>'is_minor')::boolean then '+1 868 555 0199' else '' end,person->>'preferences',person->>'sensitivities',person->>'private_notes')
    on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(payload->'appointments') loop
    aid:=(item->>'id')::uuid;
    if exists(select 1 from public.lj_calendar where id=aid) then continue; end if;
    -- Give the client test account a real upcoming booking and historical visits.
    cid:=case when item->>'source_key'='demo-appointment-0' or item->>'source_key' like 'demo-history-demo-client-0-%' then owner_client else (item->>'client_id')::uuid end;
    if exists(select 1 from public.lj_calendar where status in ('pending','confirmed') and tstzrange(starts_at,occupied_until,'[)') && tstzrange((item->>'starts_at')::timestamptz,(item->>'ends_at')::timestamptz,'[)')) and item->>'status' in ('pending','confirmed') then continue; end if;
    insert into public.lj_calendar(id,customer_id,client_id,starts_at,ends_at,kind,status,services,total,deposit,deposit_paid,note,is_vip,vip_percentage,vip_premium,approval_status,vip_reason,block_reason,block_description)
    values(aid,case when cid=owner_client then owner_id else null end,cid,(item->>'starts_at')::timestamptz,(item->>'ends_at')::timestamptz,item->>'kind',item->>'status',item->'services',(item->>'total')::numeric,(item->>'deposit')::numeric,(item->>'deposit_paid')::boolean,item->>'note',coalesce((item->>'is_vip')::boolean,false),(item->>'vip_percentage')::integer,coalesce((item->>'vip_premium')::numeric,0),coalesce(item->>'approval_status','not_required'),case when (item->>'is_vip')::boolean then 'Development demo VIP request' else null end,coalesce(item->>'block_reason','personal'),coalesce(item->>'block_description',''));
  end loop;
  for item in select value from jsonb_array_elements(payload->'transactions') loop
    aid:=(item->>'appointment_id')::uuid;
    if not exists(select 1 from public.lj_calendar where id=aid) then continue; end if;
    insert into public.lj_transactions(id,appointment_id,client_id,customer_id,amount,method,reference,status,received_at,created_at)
    select (item->>'id')::uuid,aid,c.client_id,c.customer_id,(item->>'amount')::numeric,item->>'method',item->>'reference',item->>'status',(item->>'received_at')::timestamptz,(item->>'created_at')::timestamptz from public.lj_calendar c where c.id=aid
    on conflict do nothing;
  end loop;
  for person in select value from jsonb_array_elements(payload->'vendors') loop
    vid:=(person->>'id')::uuid;
    insert into public.lj_vendors(id,name,company,contact_person,email,phone,notes,is_demo)
    values(vid,person->>'name',person->>'company',person->>'contact_person',person->>'email',person->>'phone',person->>'notes',true) on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(payload->'vendor_purchases') loop
    select v.id into vid from public.lj_vendors v join jsonb_array_elements(payload->'vendors') d on lower(v.name)=lower(d->>'name') where d->>'id'=item->>'vendor_id' limit 1;
    insert into public.lj_vendor_purchases(id,vendor_id,inventory_kind,item_name,brand,quantity,unit_cost,purchase_date,payment_method,payment_status,paid_amount,is_demo,created_by)
    values((item->>'id')::uuid,vid,item->>'inventory_kind',item->>'item_name',item->>'brand',(item->>'quantity')::numeric,(item->>'unit_cost')::numeric,(item->>'purchase_date')::date,item->>'payment_method',item->>'payment_status',(item->>'paid_amount')::numeric,true,owner_id) on conflict do nothing;
  end loop;
  for item in select jsonb_build_object('name',name,'method',method,'remaining',remaining) from (values ('Demo Hydrating Shampoo','applications',30),('Demo Color Developer','applications',8),('Demo Sanitizing Solution','time',1),('Demo Deep Conditioner','applications',18)) as i(name,method,remaining) loop
    sample_id:=md5('lady-j-demo-backbar:'||(item->>'name'))::uuid;
    insert into public.lj_backbar_items(id,name,brand,size_label,tracking_method,quantity,applications_remaining,applications_per_container,low_stock_threshold,expires_on,notes)
    values(sample_id,item->>'name','Sample data','Salon size',item->>'method',1,case when item->>'method'='applications' then (item->>'remaining')::numeric else null end,case when item->>'method'='applications' then 40 else null end,5,case when item->>'method'='time' then current_date+30 else null end,'Fictional Development demo inventory.') on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(payload->'backbar') loop
    insert into public.lj_backbar_items(id,name,brand,size_label,category_id,tracking_method,quantity,applications_remaining,applications_per_container,low_stock_threshold,notes)
    values((item->>'id')::uuid,item->>'name',item->>'brand',item->>'size_label',(select id from lj_backbar_categories where name=item->>'category_id' limit 1),'applications',(item->>'quantity')::numeric,(item->>'applications_remaining')::numeric,(item->>'applications_per_container')::numeric,(item->>'low_stock_threshold')::numeric,item->>'notes') on conflict do nothing;
  end loop;
  select id into vid from public.lj_vendors where is_demo order by id limit 1;
  insert into public.lj_vendor_purchases(id,vendor_id,inventory_kind,item_name,brand,quantity,unit_cost,purchase_date,payment_method,payment_status,paid_amount,is_demo,created_by)
  values(md5('lady-j-demo-vendor-purchase')::uuid,vid,'backbar','Demo Hydrating Shampoo','Sample data',3,85,current_date-2,'cash','paid',255,true,owner_id) on conflict do nothing;
  insert into public.lj_expenses(id,spent_on,category,description,amount,reference,recorded_by)
  values(md5('lady-j-demo-expense')::uuid,current_date-1,'Supplies','DEMO · Salon supplies',125,'DEMO-EXPENSE',owner_id) on conflict do nothing;
  for item in select value from jsonb_array_elements(payload->'discounts') loop
    insert into public.lj_discounts(id,name,code,percentage,scope,active)
    values((item->>'id')::uuid,item->>'name',item->>'code',(item->>'percentage')::numeric,item->>'scope',true) on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(payload->'promotions') loop
    insert into public.lj_promotions(id,name,description,active)
    values((item->>'id')::uuid,item->>'name',item->>'description',true) on conflict do nothing;
  end loop;
  select * into service_record from public.lj_services where active and bookable and deleted_at is null and not is_special and price>0 order by name limit 1;
  insert into public.lj_consultation_requests(id,request_key,customer_id,client_id,client_name,client_email,whatsapp_phone,whatsapp_consent,service_ids,selected_services,primary_service_id,primary_service,desired_outcomes,visit_special,occasion,previous_experience,availability_days,availability_times,allergy_status,accessibility_needs,summary,status)
  select md5('lady-j-demo-consultation')::uuid,md5('lady-j-demo-consultation-key')::uuid,owner_id,owner_client,c.full_name,coalesce(c.email,'test@demo.invalid'),'',false,array[service_record.id],jsonb_build_array(jsonb_build_object('id',service_record.id,'name',service_record.name)),service_record.id,jsonb_build_object('id',service_record.id,'name',service_record.name),array['Healthy hair'],'Routine care','None','DEMO · First consultation',array['Tuesday'],array['Morning'],'None',array['None'],'DEMO · Fictional consultation for final Development testing.','new' from public.lj_client_records c where c.id=owner_client
  on conflict do nothing;
  -- Use real checkout so stock reservation, order numbers and transaction links remain valid.
  if not exists(select 1 from public.lj_purchases where request_key=md5('lady-j-demo-product-order')::uuid) then
    select id into sample_id from public.lj_products where active and is_demo and stock>0 and deleted_at is null order by name limit 1;
    if sample_id is not null then
      perform public.lj_checkout_v2('product',jsonb_build_array(jsonb_build_object('id',sample_id,'quantity',1)),'pickup','','DEMO-BANK-ORDER','',md5('lady-j-demo-product-order')::uuid,'Development Test Client','client@demo.invalid','+18685550199');
    end if;
  end if;
  if not exists(select 1 from public.lj_purchases where request_key=md5('lady-j-demo-workshop-order')::uuid) then
    select id into sample_id from public.lj_workshops where active and is_demo and deleted_at is null order by name limit 1;
    if sample_id is not null then
      perform public.lj_checkout_v2('workshop',jsonb_build_array(jsonb_build_object('id',sample_id,'quantity',1)),'online','','DEMO-BANK-WORKSHOP','',md5('lady-j-demo-workshop-order')::uuid,'Development Test Client','client@demo.invalid','+18685550199');
      select t.id into sample_id from public.lj_transactions t join public.lj_purchases p on p.id=t.purchase_id where p.request_key=md5('lady-j-demo-workshop-order')::uuid and t.status='pending' limit 1;
      if sample_id is not null then perform public.lj_verify_payment(sample_id); end if;
    end if;
  end if;
  for offset_day in 1..14 loop
    sample_day:=(now() at time zone 'America/Port_of_Spain')::date+offset_day;
    if extract(isodow from sample_day) between 2 and 6 and not exists(select 1 from public.lj_waitlist where customer_id=owner_id and requested_date=sample_day and service_ids=array[service_record.id]) and (select count(*) from public.lj_waitlist where customer_id=owner_id and status='waiting')<8 then
      perform public.lj_join_waitlist(sample_day,array[service_record.id]);
    end if;
  end loop;
end $seed$;
select (select count(*) from public.lj_client_records where email like '%@demo.invalid') as fictional_clients,
 (select count(*) from public.lj_calendar where note like 'DEMO%') as demo_calendar_records,
 (select count(*) from public.lj_transactions where reference like 'DEMO%') as demo_payments;
`;
process.stdout.write(sql);
