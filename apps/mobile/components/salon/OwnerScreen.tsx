import { productRows, serviceRows } from "@/lib/salon/catalogData";
import { useLocalSearchParams } from "expo-router";
import OwnerFeedback, {
  appreciationMessages,
  type OwnerFeedbackValue,
} from "./owner/OwnerFeedback";
import MessageClientMenu from "./owner/MessageClientMenu";
import ClientMediaGallery from "./media/ClientMediaGallery";
import MediaUpload from "./media/MediaUpload";
import { useCelebrationSounds } from "@/lib/salon/useCelebrationSounds";
import StatusNotice from "./StatusNotice";
import ContactRemovalConfirmation from "./owner/ContactRemovalConfirmation";
import ClientPurchaseHistory from "./owner/ClientPurchaseHistory";
import OwnerClientLoyalty from "./owner/OwnerClientLoyalty";
import LoyaltySettings from "./owner/LoyaltySettings";
import GiftsReferralsPanel from "./owner/GiftsReferralsPanel";
import OwnerClientMediaPreview from "./owner/OwnerClientMediaPreview";
import MoneyCelebration from "./owner/MoneyCelebration";
import DownloadReports from "./owner/DownloadReports";
import BusinessSettings from "./owner/BusinessSettings";
import CompletionCelebration from "./owner/CompletionCelebration";
import { createOwnerCalendarDemo } from "@/lib/salon/ownerCalendarDemo";
import { activitiesOnDate, localCalendarTime } from "@/lib/salon/calendarActivity";
import BlockActivityCard from "./owner/BlockActivityCard";
import { useCalendarRealtime } from "@/lib/salon/useCalendarRealtime";
import CalendarDashboard from "./owner/CalendarDashboard";
import BlockTimeEditor from "./owner/BlockTimeEditor";
import { serviceDurationLabel } from "@/lib/salon/duration";
import ServiceCategoryField from "./owner/ServiceCategoryField";
import ServiceCategories from "./ServiceCategories";
import OwnerEditorPortal from "./owner/OwnerEditorPortal";
import { useBottomNavigationSpacing } from "./BottomNavigation";
import { AgreementList, AppointmentAgreement } from "./ServiceAgreement";
import { DateField, DateTimeField, DurationField } from "./DateFields";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { orderServicesByCategory } from "@/lib/salon/categories";
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import { db, check, asRows } from "@/lib/salon/client";
import { signOutCurrentDevice } from "@/lib/salon/auth";
import { devOwnerAutoSignIn } from "@/lib/salon/testMode";
import {
  Appointment,
  Client,
  Transaction,
  Purchase,
  Service,
  Product,
  Workshop,
  money,
  servicePriceLabel,
  dateLabel,
  timeLabel,
} from "@/lib/salon/types";
import { demoClients, demoAppointments, demoTransactions } from "@/lib/salon/demo";
import {
  createOwnerDemoCommerce,
  createOwnerDemoWaitlist,
  ownerDemoDiscounts,
  ownerDemoPromotions,
} from "@/lib/salon/ownerDemo";
import { fonts, fieldLabel } from "@/lib/salon/design";
import { useNav } from "./Shell";
import { Card, ButtonLabel, useColors, shared, ErrorBox, Photo, Txt } from "./ui";
import { whatsappSupportUrl } from "@/lib/salon/whatsapp";
import CatalogPhotoEditor from "./owner/CatalogPhotoEditor";
import SpecialsPanel from "./owner/SpecialsPanel";
import { todayKey } from "./BookingScreen";
import OwnerWorkspace from "./owner/OwnerWorkspace";
import { appointmentsForToday, salonDayKey } from "@/lib/salon/ownerToday";
import TodayDashboard, { OwnerAction } from "./owner/TodayDashboard";
import ClientsPanel from "./owner/ClientsPanel";
import ConsultationRequestsPanel from "./owner/ConsultationRequestsPanel";
import BusinessOverview from "./owner/BusinessOverview";
import RevenuePanel from "./owner/RevenuePanel";
import DiscountsPanel from "./owner/DiscountsPanel";
import OrderDiscountDialog, { DiscountTarget } from "./owner/OrderDiscountDialog";
import { Discount } from "@/lib/salon/discounts";
import PaymentCompletion from "./owner/PaymentCompletion";
import { appointmentPayment } from "@/lib/salon/appointmentPayment";
import AppointmentCard from "./owner/AppointmentCard";
import { useForegroundRefresh } from "@/lib/salon/useForegroundRefresh";
import { WaitlistEntry, ownerAttention, isLowStock } from "@/lib/salon/ownerAssistant";
import DailyBriefing from "./owner/DailyBriefing";
import TodayPreparation from "./owner/TodayPreparation";
import GuardianFields from "./owner/GuardianFields";
import { contactIsMinor } from "@/lib/salon/ownerPrep";
import WaitlistPanel from "./owner/WaitlistPanel";
import ExpensesPanel from "./owner/ExpensesPanel";
import CommunicationPanel from "./owner/CommunicationPanel";
import MariaPanel from "./owner/MariaPanel";
import BackbarPanel from "./owner/BackbarPanel";
import VendorSpendingPanel from "./owner/VendorSpendingPanel";
import { OwnerText as OT, OwnerButton as OA } from "./owner/OwnerUI";
import { ProfilePhotoEditor } from "./ProfilePhoto";

type Row = Record<string, unknown>;
type Editor = {
  title: string;
  table: string;
  fields: { key: string; label: string; type?: "number" | "multiline" | "boolean" }[];
  values: Row;
};
function OF({
  label,
  value,
  onChange,
  multiline = false,
  keyboardType = "default",
  readOnly = false,
  disabled = false,
  wrap = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  wrap?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
}) {
  const c = useColors();
  const [inputHeight, setInputHeight] = useState(0);
  return (
    <View style={{ gap: 9, marginBottom: 18 }}>
      {readOnly ? (
        <>
          <OT>{fieldLabel(label)}</OT>
          <View
            style={{
              backgroundColor: c.background,
              borderWidth: 1,
              borderColor: c.border,
              padding: 15,
              borderRadius: 10,
              minHeight: 58,
              justifyContent: "center",
            }}
          >
            <OT>{value || "Not recorded"}</OT>
          </View>
        </>
      ) : (
        <>
          <OT>{fieldLabel(label)}</OT>
          <TextInput
            accessibilityLabel={fieldLabel(label)}
            value={value}
            editable={!disabled}
            onChangeText={wrap ? (text) => onChange(text.replace(/\r?\n/g, "")) : onChange}
            multiline={multiline || wrap}
            scrollEnabled={!(multiline || wrap)}
            onContentSizeChange={
              multiline || wrap
                ? (event) => setInputHeight(event.nativeEvent.contentSize.height)
                : undefined
            }
            keyboardType={keyboardType}
            autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
            style={{
              backgroundColor: c.background,
              borderWidth: 1,
              borderColor: c.border,
              color: c.foreground,
              padding: 15,
              borderRadius: 10,
              fontFamily: fonts.body,
              fontSize: 20,
              minHeight: multiline
                ? Math.max(130, inputHeight)
                : wrap
                  ? Math.max(58, inputHeight)
                  : 58,
              textAlignVertical: multiline || wrap ? "top" : "center",
            }}
          />
        </>
      )}
    </View>
  );
}
export default function OwnerScreen() {
  const routeParams = useLocalSearchParams<{ tab?: string; consultation?: string }>();
  const routeTab = ["Today", "Calendar", "Clients", "Business", "Maria"].includes(
    String(routeParams.tab),
  )
    ? String(routeParams.tab)
    : undefined;

  const s = useSalon(),
    c = useColors(),
    go = useNav(),
    { width } = useWindowDimensions();
  const sounds = useCelebrationSounds();
  const navigationSpacing = useBottomNavigationSpacing(true);
  const catalogScroll = useRef<ScrollView>(null);
  const [todayDate, setTodayDate] = useState(() => salonDayKey());
  useEffect(() => {
    const timer = setInterval(() => setTodayDate(salonDayKey()), 60000);
    return () => clearInterval(timer);
  }, []);
  const loadGeneration = useRef(0);
  const demoLoaded = useRef(false);
  const hasLoaded = useRef(false);
  const [feedback, setFeedback] = useState<OwnerFeedbackValue | null>(null);
  const previousAppreciation = useRef<string>("");
  const [contactActions, setContactActions] = useState<{
    name: string;
    whatsapp?: string;
    phone?: string;
    message?: string;
  } | null>(null);
  const [mediaContext, setMediaContext] = useState<{
    mode: "upload" | "gallery";
    clientId?: string;
    appointmentId?: string;
  } | null>(null);
  const [waiting, setWaiting] = useState<WaitlistEntry[]>([]);
  const [failedMessages, setFailedMessages] = useState(0);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [catalogPage, setCatalogPage] = useState(0);
  const [ownerCatalogCategory, setOwnerCatalogCategory] = useState("All");
  const [demoNotifications, setDemoNotifications] = useState(false);
  const [paymentCelebration, setPaymentCelebration] = useState(0);
  const [rejectingPayment, setRejectingPayment] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
  const [celebration, setCelebration] = useState<Appointment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [navigationRevision, setNavigationRevision] = useState(0);
  const [tab, setTab] = useState(routeTab || "Today"),
    [section, setSection] = useState(routeParams.consultation ? "Consultations" : "Overview"),
    [appointments, setAppointments] = useState<Appointment[]>([]),
    [clients, setClients] = useState<Client[]>([]),
    [transactions, setTransactions] = useState<Transaction[]>([]),
    [purchases, setPurchases] = useState<Purchase[]>([]),
    [serviceRecords, setServices] = useState<Service[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [workshops, setWorkshops] = useState<Workshop[]>([]),
    [profiles, setProfiles] = useState<Row[]>([]),
    [attendance, setAttendance] = useState<Row[]>([]),
    [demoSettings, setDemoSettings] = useState<Row | null>(null),
    [demoPromotions, setDemoPromotions] = useState<Row[]>(s.promotions as unknown as Row[]),
    [demoResources, setDemoResources] = useState<Record<string, Row>>({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<{
      text: string;
      detail?: string;
      actionLabel?: string;
      cancelLabel?: string;
      run: () => Promise<void>;
    } | null>(null),
    [demoDiscounts, setDemoDiscounts] = useState<Discount[]>([]),
    [discountTarget, setDiscountTarget] = useState<DiscountTarget | null>(null),
    [paymentAppointment, setPaymentAppointment] = useState<Appointment | null>(null),
    [selectedClient, setSelectedClient] = useState<Client | null>(null),
    [editingContact, setEditingContact] = useState(false),
    [expandedAppointment, setExpandedAppointment] = useState(""),
    [enrollmentWorkshopId, setEnrollmentWorkshopId] = useState(""),
    [calendarDate, setCalendarDate] = useState(todayKey()),
    [calendarSelected, setCalendarSelected] = useState(false),
    [editingBlock, setEditingBlock] = useState<Appointment | null>(null),
    [initialBlockReason, setInitialBlockReason] = useState("personal"),
    [calendarView, setCalendarView] = useState("Month"),
    [calendarForm, setCalendarForm] = useState<"appointment" | "block" | null>(null),
    [start, setStart] = useState(`${todayKey()}T10:00`),
    [note, setNote] = useState(""),
    [serviceId, setServiceId] = useState(""),
    [ownerServiceCategory, setOwnerServiceCategory] = useState("All"),
    [customerId, setCustomerId] = useState(""),
    [newClientName, setNewClientName] = useState(""),
    [newClientEmail, setNewClientEmail] = useState(""),
    [newClientPhone, setNewClientPhone] = useState("");
  const services = useMemo(() => orderServicesByCategory(serviceRecords), [serviceRecords]);
  useEffect(() => {
    if (routeTab) setTab(routeTab);
  }, [routeTab]);
  useEffect(() => {
    if (routeParams.consultation) {
      setTab("Business");
      setSection("Consultations");
    }
  }, [routeParams.consultation]);
  const demo = s.demoOwner && !s.owner,
    allowed = s.owner || demo;
  useEffect(() => {
    setEditingContact(false);
    setError("");
  }, [selectedClient?.id]);
  useEffect(() => {
    if (!selectedClient) return;
    const current = clients.find((client) => client.id === selectedClient.id);
    if (!current || current.profile_photo_updated_at === selectedClient.profile_photo_updated_at)
      return;
    setSelectedClient((old) =>
      old
        ? {
            ...old,
            client_photo_path: current.client_photo_path,
            owner_photo_path: current.owner_photo_path,
            use_owner_photo: current.use_owner_photo,
            profile_photo_updated_at: current.profile_photo_updated_at,
          }
        : old,
    );
  }, [clients, selectedClient]);
  const load = useCallback(
    async (quiet = false) => {
      const generation = ++loadGeneration.current;
      if (!demo) demoLoaded.current = false;
      if (!allowed) {
        hasLoaded.current = false;
        return;
      }
      setError("");
      if (demo) {
        if (demoLoaded.current || s.loading) return;
        demoLoaded.current = true;
        setAppointments([...demoAppointments, ...createOwnerCalendarDemo(salonDayKey())]);
        setClients(demoClients);
        const demoProducts = s.session ? s.products : s.products.map((v) => ({ ...v, price: 180 }));
        const demoWorkshops = s.session
          ? s.workshops
          : s.workshops.map((v) => ({ ...v, price: 650 }));
        const demoServices = s.session ? s.services : s.services.map((v) => ({ ...v, price: 350 }));
        const commerce = createOwnerDemoCommerce(demoProducts, demoWorkshops);
        setTransactions([...demoTransactions, ...commerce.transactions]);
        setPurchases(commerce.purchases);
        setServices(demoServices);
        setWaiting(createOwnerDemoWaitlist(demoServices));
        setDemoDiscounts(ownerDemoDiscounts);
        setDemoPromotions(ownerDemoPromotions as unknown as Row[]);
        setAttendance(
          commerce.purchases
            .filter((purchase) => purchase.kind === "workshop" && purchase.status !== "pending")
            .map((purchase, index) => ({
              id: `demo-attendance-${index + 1}`,
              purchase_id: purchase.id,
              customer_id: purchase.customer_id,
              attended: index % 2 === 0,
              certificate_ready: index === 0,
            })),
        );
        setDemoResources(
          Object.fromEntries(
            demoWorkshops.slice(0, 5).map((workshop, index) => [
              workshop.id,
              {
                workshop_id: workshop.id,
                title: `${workshop.name} Demo Workbook`,
                resource_url: `https://example.invalid/demo-workbook-${index + 1}`,
              },
            ]),
          ),
        );
        const cream = demoProducts.find((product) => /anti.?ag(?:e|ing)/i.test(product.name));
        setProducts(
          cream
            ? demoProducts.map((product) =>
                product.id === cream.id ? { ...product, stock: 2, reorder_level: 3 } : product,
              )
            : [
                ...demoProducts,
                {
                  id: "demo-anti-aging-cream",
                  name: "Anti-aging cream",
                  description: "Daily skincare cream.",
                  brand: "Lady J",
                  category: "Skincare",
                  price: 240,
                  stock: 2,
                  reorder_level: 3,
                  image: "body",
                  active: true,
                  is_demo: true,
                },
              ],
        );
        setWorkshops(demoWorkshops);
        hasLoaded.current = true;
        setLoading(false);
        return;
      }
      if (!quiet) setLoading(true);
      try {
        const tables = [
          "lj_calendar",
          "lj_client_records",
          "lj_transactions",
          "lj_purchases",
          "lj_services",
          "lj_products",
          "lj_workshops",
          "lj_profiles",
          "lj_attendance",
          "lj_waitlist",
        ];
        const fetchRows = async (table: string) => {
          if (
            ![
              "lj_calendar",
              "lj_transactions",
              "lj_purchases",
              "lj_client_records",
              "lj_profiles",
              "lj_waitlist",
            ].includes(table)
          ) {
            let query = db().from(table).select("*");
            if (["lj_services", "lj_products", "lj_workshops"].includes(table))
              query = query.is("deleted_at", null);
            return check(await query);
          }
          const rows: Row[] = [];
          for (let offset = 0; ; offset += 1000) {
            let query = db()
              .from(table)
              .select("*")
              .order("id")
              .range(offset, offset + 999);
            if (table === "lj_client_records") query = query.is("deleted_at", null);
            if (table === "lj_waitlist")
              query = query.eq("status", "waiting").gte("requested_date", salonDayKey());
            const page = asRows<Row>(check(await query), table);
            rows.push(...page);
            if (page.length < 1000) break;
          }
          return rows;
        };
        const r = await Promise.all(tables.map(fetchRows));
        if (generation !== loadGeneration.current) return;
        setAppointments(r[0] as Appointment[]);
        setClients(r[1] as Client[]);
        setTransactions(r[2] as Transaction[]);
        setPurchases(r[3] as Purchase[]);
        setServices(serviceRows(r[4]));
        setProducts(productRows(r[5]));
        setWorkshops(r[6] as Workshop[]);
        setProfiles(r[7] as Row[]);
        setAttendance(r[8] as Row[]);
        setWaiting(r[9] as WaitlistEntry[]);
        hasLoaded.current = true;
        const failed = await db()
          .from("lj_message_jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed");
        if (generation === loadGeneration.current && !failed.error)
          setFailedMessages(failed.count || 0);
      } catch (e) {
        if (generation === loadGeneration.current)
          setError(e instanceof Error ? e.message : "Unable to load the workspace.");
      } finally {
        if (generation === loadGeneration.current) setLoading(false);
      }
    },
    [allowed, demo, s.services, s.products, s.workshops, s.session?.user.id, s.loading],
  );
  useEffect(() => {
    void load(hasLoaded.current);
  }, [load]);
  useForegroundRefresh(() => load(true), allowed && !demo);
  const calendarSync = useCalendarRealtime(() => load(true), allowed && !demo);
  useEffect(() => {
    if (!allowed || demo) return;
    const channel = db()
      .channel("lj-owner-client-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lj_profiles" },
        () => void load(true),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lj_client_records" },
        () => void load(true),
      )
      .subscribe();
    return () => {
      void db().removeChannel(channel);
    };
  }, [allowed, demo, load]);
  const refreshWorkspace = async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    setCatalogPage(0);
  }, [section, lowStockOnly, ownerCatalogCategory]);
  const catalogItems =
    section === "Services"
      ? services.filter(
          (v) =>
            !v.is_special &&
            (ownerCatalogCategory === "All" || v.category === ownerCatalogCategory),
        )
      : section === "Products"
        ? products.filter((v) => !lowStockOnly || isLowStock(v))
        : workshops;
  const catalogPages = Math.max(1, Math.ceil(catalogItems.length / 12));
  const currentCatalogPage = Math.min(catalogPage, catalogPages - 1);
  useEffect(() => {
    catalogScroll.current?.scrollTo({ y: 0, animated: false });
  }, [currentCatalogPage]);
  const attention = ownerAttention(
    appointments,
    transactions,
    purchases,
    products,
    waiting,
    failedMessages,
  );
  const nameFor = (id: string | null, clientId?: string | null) =>
    clients.find((v) => v.id === clientId || v.id === id || v.customer_id === id)?.full_name ||
    String(profiles.find((v) => v.id === id)?.full_name || "Client");
  const today = appointmentsForToday(appointments, todayDate);
  function openEditor(table: string, row?: Row) {
    const config: Record<string, { title: string; fields: Editor["fields"]; defaults: Row }> = {
      lj_services: {
        title: row ? "Edit service" : "Add service",
        fields: [
          { key: "category", label: "Category" },
          { key: "name", label: "Name" },
          { key: "description", label: "Description", type: "multiline" },
          { key: "duration", label: "Duration", type: "number" },
          { key: "price", label: "Price", type: "number" },
          { key: "active", label: "Available for booking", type: "boolean" },
        ],
        defaults: {
          name: "",
          category: "Hair",
          description: "",
          duration: 60,
          price: 0,
          image: "hair",
          active: true,
          is_demo: demo,
        },
      },
      lj_products: {
        title: row ? "Edit product" : "Add product",
        fields: [
          { key: "name", label: "Product name" },
          { key: "brand", label: "Brand" },
          { key: "category", label: "Category" },
          { key: "description", label: "Description & ingredients", type: "multiline" },
          { key: "price", label: "Price", type: "number" },
          { key: "stock", label: "Stock quantity", type: "number" },
          { key: "reorder_level", label: "Low-stock alert level (0 = off)", type: "number" },
          { key: "active", label: "Available in boutique", type: "boolean" },
        ],
        defaults: {
          name: "",
          category: "Hair care",
          description: "",
          price: 0,
          stock: 0,
          reorder_level: 3,
          image: "oil",
          active: true,
          is_demo: demo,
        },
      },
      lj_workshops: {
        title: row ? "Edit workshop" : "Create workshop",
        fields: [
          { key: "name", label: "Workshop name" },
          { key: "description", label: "Description", type: "multiline" },
          { key: "instructor", label: "Instructor" },
          { key: "starts_at", label: "Workshop start" },
          { key: "duration", label: "Duration", type: "number" },
          { key: "format", label: "Workshop format" },
          { key: "price", label: "Price", type: "number" },
          { key: "capacity", label: "Capacity", type: "number" },
          { key: "active", label: "Accepting registrations", type: "boolean" },
        ],
        defaults: {
          name: "",
          description: "",
          instructor: "Lady J",
          starts_at: "",
          duration: 120,
          format: "In person",
          price: 0,
          capacity: 12,
          image: "workshop",
          active: true,
          is_demo: demo,
        },
      },
      lj_client_records: {
        title: row ? "Client Details" : "Add Client",
        fields: [
          { key: "first_name", label: "First Name" },
          { key: "last_name", label: "Last Name" },
          { key: "birthday", label: "DOB" },
          { key: "email", label: "Email" },
          { key: "whatsapp_phone", label: "WhatsApp Number" },
          { key: "private_notes", label: "Notes", type: "multiline" },
        ],
        defaults: {
          first_name: "",
          last_name: "",
          full_name: "",
          birthday: "",
          email: "",
          phone: "",
          preferences: "",
          sensitivities: "",
          private_notes: "",
          photo_consent: false,
          is_minor: false,
          guardian_name: "",
          guardian_relationship: "",
          guardian_phone: "",
          guardian_email: "",
        },
      },
      lj_settings: {
        title: "Business settings",
        fields: [
          { key: "business_name", label: "Business name" },
          { key: "address", label: "Salon address" },
          { key: "contact_phone", label: "Contact phone" },
          { key: "whatsapp_phone", label: "WhatsApp support number (include country code)" },
          { key: "contact_email", label: "Contact email" },
          { key: "bank_name", label: "Bank name" },
          { key: "bank_account_name", label: "Registered bank account name" },
          { key: "bank_account_type", label: "Bank account type" },
          { key: "bank_account_number", label: "Bank account number" },
          { key: "bank_currency", label: "Bank currency" },
          {
            key: "bank_account_verified",
            label: "Registered account name verified",
            type: "boolean",
          },
          { key: "bank_instructions", label: "Bank transfer instructions", type: "multiline" },
          { key: "delivery_fee", label: "Delivery Fee", type: "number" },
          {
            key: "max_daily_bookings_per_client",
            label: "Appointments per client per day (0 = unlimited)",
            type: "number",
          },
        ],
        defaults: {
          max_daily_bookings_per_client: 1,
          bank_name: "First Citizens Bank",
          bank_account_name: "LADY J SALON AND DAY SPA",
          bank_account_type: "Savings",
          bank_account_number: "3201297",
          bank_currency: "TTD",
          bank_account_verified: false,
        },
      },
      lj_promotions: {
        title: "Create promotion",
        fields: [
          { key: "name", label: "Offer name" },
          { key: "description", label: "Offer details", type: "multiline" },
          { key: "active", label: "Visible to customers", type: "boolean" },
        ],
        defaults: { name: "", description: "", active: true },
      },
      lj_attendance: {
        title: "Attendance & completion",
        fields: [
          { key: "attended", label: "Attended / completed", type: "boolean" },
          { key: "certificate_url", label: "Individual certificate HTTPS link" },
        ],
        defaults: { attended: false, certificate_url: "" },
      },
      lj_workshop_resources: {
        title: "Workshop resources",
        fields: [
          { key: "live_url", label: "Live session HTTPS link" },
          { key: "materials_url", label: "Materials HTTPS link" },
        ],
        defaults: {},
      },
    };
    const v = config[table];
    if (v)
      setEditor({ title: v.title, table, fields: v.fields, values: { ...v.defaults, ...row } });
  }
  function requestCatalogRemoval() {
    if (!editor?.values.id || busy) return;
    const item = editor;
    const kind =
      item.table === "lj_services"
        ? "service"
        : item.table === "lj_products"
          ? "product"
          : "workshop";
    const id = String(item.values.id);
    setError("");
    setConfirm({
      text: "Are you sure you want to delete this " + kind + "?",
      detail:
        String(item.values.name || "This item") +
        " will be removed from the catalog. Existing appointments, purchases and workshop access will be kept.",
      actionLabel: "Delete " + kind,
      cancelLabel: "Keep " + kind,
      run: async () => {
        if (demo) {
          if (
            kind === "service" &&
            services.some(
              (service) =>
                service.active && service.is_special && service.included_service_ids?.includes(id),
            )
          )
            throw new Error(
              "This service is used by an active Special. Remove it from that Special before deleting.",
            );
          if (kind === "service") setServices((old) => old.filter((value) => value.id !== id));
          if (kind === "product") setProducts((old) => old.filter((value) => value.id !== id));
          if (kind === "workshop") setWorkshops((old) => old.filter((value) => value.id !== id));
          s.notify(kind.charAt(0).toUpperCase() + kind.slice(1) + " deleted.");
        } else {
          check(await db().rpc("lj_delete_catalog_item", { p_kind: kind, p_id: id }));
          await load();
          await s.refresh();
          s.notify(kind.charAt(0).toUpperCase() + kind.slice(1) + " removed from the catalog.");
        }
        setEditor(null);
      },
    });
  }
  async function save() {
    if (!editor) return;
    setError("");
    setBusy(true);
    try {
      const values = { ...editor.values };
      if ("first_name" in values) {
        if (!String(values.first_name).trim() || !String(values.last_name).trim())
          throw new Error("Enter a first and last name.");
        values.full_name = `${String(values.first_name).trim()} ${String(values.last_name).trim()}`;
      }
      for (const f of editor.fields) {
        if (f.type === "number") {
          const n = Number(values[f.key]);
          if (!Number.isFinite(n) || n < 0)
            throw new Error(`${fieldLabel(f.label)} must be a valid positive number.`);
          values[f.key] = n;
        }
        if (
          f.key.endsWith("_url") &&
          values[f.key] &&
          !String(values[f.key]).startsWith("https://")
        )
          throw new Error("Resource links must start with https://.");
      }
      if ("name" in values && !String(values.name).trim()) throw new Error("Enter a name.");
      if ("full_name" in values && !String(values.full_name).trim())
        throw new Error("Enter a client name.");
      if ("starts_at" in values) {
        if (values.starts_at && Number.isNaN(Date.parse(String(values.starts_at))))
          throw new Error("Enter a valid workshop date/time with a timezone.");
        values.starts_at = values.starts_at
          ? /Z$|[+-]\d{2}:\d{2}$/.test(String(values.starts_at))
            ? values.starts_at
            : `${values.starts_at}-04:00`
          : null;
      }
      if (
        "whatsapp_phone" in values &&
        values.whatsapp_phone &&
        !whatsappSupportUrl(String(values.whatsapp_phone))
      )
        throw new Error(
          "Enter the complete WhatsApp number with its country code, or leave it empty.",
        );
      if (
        "max_daily_bookings_per_client" in values &&
        (!Number.isInteger(values.max_daily_bookings_per_client) ||
          Number(values.max_daily_bookings_per_client) > 10)
      )
        throw new Error("Choose a whole number from 0 to 10 for the daily booking limit.");
      if (
        "reorder_level" in values &&
        (!Number.isInteger(values.reorder_level) || Number(values.reorder_level) > 10000)
      )
        throw new Error("Choose a whole number from 0 to 10,000 for the stock alert.");
      if ("birthday" in values) values.birthday = values.birthday || null;
      if (editor.table === "lj_client_records") {
        values.is_minor = contactIsMinor(
          values.birthday ? String(values.birthday) : null,
          Boolean(values.is_minor),
        );
        if (values.is_minor && !String(values.guardian_name || "").trim())
          throw new Error("Enter a parent or guardian name.");
        if (
          values.guardian_email &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.guardian_email))
        )
          throw new Error("Enter a valid parent or guardian email, or leave it empty.");
      }
      if ("format" in values && !["In person", "Online"].includes(String(values.format)))
        throw new Error("Choose In person or Online.");
      if (demo) {
        const id = String(values.id || `demo-${Date.now()}`),
          row = { ...values, id };
        const up = <T extends { id: string }>(arr: T[]) => [
          ...arr.filter((v) => v.id !== id),
          row as unknown as T,
        ];
        if (editor.table === "lj_services") setServices(up);
        if (editor.table === "lj_products") setProducts(up);
        if (editor.table === "lj_workshops") setWorkshops(up);
        if (editor.table === "lj_client_records") setClients(up);
        if (editor.table === "lj_settings") setDemoSettings(values);
        if (editor.table === "lj_promotions")
          setDemoPromotions((old) => [...old.filter((v) => v.id !== id), row]);
        if (editor.table === "lj_workshop_resources")
          setDemoResources((old) => ({ ...old, [String(values.workshop_id)]: values }));
        if (editor.table === "lj_attendance")
          setAttendance((old) => [
            ...old.filter((v) => v.purchase_id !== values.purchase_id),
            values,
          ]);
        s.notify("Changes saved.");
      } else {
        if (editor.table === "lj_client_records") delete values.medical_conditions;
        check(await db().from(editor.table).upsert(values));
        await load();
        await s.refresh();
        s.notify("Changes saved securely.");
      }
      setEditor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function addCalendar() {
    setBusy(true);
    setError("");
    try {
      if (calendarForm !== "appointment")
        throw new Error("Use the Block Time editor to reserve unavailable time.");
      const date = new Date(`${start}:00-04:00`);
      const service =
        calendarForm === "appointment" ? services.find((v) => v.id === serviceId) : undefined;
      const mins = service?.duration;
      if (Number.isNaN(date.valueOf()) || !mins || mins < 1 || mins > 480)
        throw new Error("Choose a valid date, time and a duration of up to 8 hours.");
      if (calendarForm === "appointment" && !service) throw new Error("Choose a service.");
      if (
        calendarForm === "appointment" &&
        !customerId &&
        (!newClientName.trim() || !newClientEmail.trim() || !newClientPhone.trim())
      )
        throw new Error("Select a saved client or enter the new client’s name, email and phone.");
      const demoClientId = customerId || `demo-client-${Date.now()}`;
      const row = {
        starts_at: date.toISOString(),
        ends_at: new Date(date.valueOf() + mins * 60000).toISOString(),
        kind: calendarForm || "appointment",
        deposit_paid: false,
        status: "pending",
        customer_id:
          calendarForm === "appointment"
            ? clients.find((client) => client.id === customerId)?.customer_id || null
            : null,
        client_id: calendarForm === "appointment" ? demoClientId : null,
        note,
        services: service
          ? [
              {
                id: service.id,
                name: service.name,
                price: service.price,
                duration: service.duration,
              },
            ]
          : [],
        total: service?.price || 0,
        deposit: (service?.price || 0) / 2,
      };
      if (demo) {
        const overlap = appointments.some(
          (a) =>
            ["pending", "confirmed"].includes(a.status) &&
            new Date(a.starts_at) < new Date(row.ends_at) &&
            new Date(a.ends_at) > date,
        );
        if (overlap) throw new Error("This time overlaps another appointment or block.");
        if (calendarForm === "appointment" && !customerId) {
          const names = newClientName.trim().split(/\s+/);
          setClients((old) => [
            ...old,
            {
              id: demoClientId,
              full_name: newClientName.trim(),
              first_name: names[0] || "",
              last_name: names.slice(1).join(" "),
              email: newClientEmail.trim(),
              phone: newClientPhone.trim(),
              preferences: "",
              sensitivities: "",
              private_notes: "",
              photo_consent: false,
            },
          ]);
        }
        setAppointments((old) => [
          ...old,
          { ...row, id: `demo-${Date.now()}` } as unknown as Appointment,
        ]);
        s.notify("Appointment saved.");
      } else {
        if (calendarForm === "appointment")
          check(
            await db().rpc("lj_owner_book_client", {
              p_service: serviceId,
              p_start: row.starts_at,
              p_client: customerId || null,
              p_name: newClientName.trim(),
              p_email: newClientEmail.trim(),
              p_phone: newClientPhone.trim(),
              p_note: note,
            }),
          );

        await load();
        s.notify("Manual appointment saved as pending payment.");
      }
      setCalendarForm(null);
      setCustomerId("");
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save this time.");
    } finally {
      setBusy(false);
    }
  }
  async function verify(t: Transaction) {
    sounds.prepare("payment");
    if (demo) {
      setTransactions((old) =>
        old.map((v) =>
          v.id === t.id ? { ...v, status: "verified", received_at: new Date().toISOString() } : v,
        ),
      );
      setAppointments((old) =>
        old.map((v) =>
          v.id === t.appointment_id
            ? { ...v, status: v.status === "pending" ? "confirmed" : v.status, deposit_paid: true }
            : v,
        ),
      );
      s.notify("Payment verified.");
    } else {
      check(await db().rpc("lj_verify_payment", { p_id: t.id }));
      await load();
      s.notify("Bank payment verified. The linked booking or purchase is now confirmed.");
    }
    sounds.play("payment", t.id);
  }
  async function openPaymentReceipt(t: Transaction) {
    if (!t.receipt_path) throw new Error("No payment receipt was uploaded.");
    const result = check(
      await db().storage.from("lj-payment-receipts").createSignedUrl(t.receipt_path, 60),
    );
    if (!result?.signedUrl) throw new Error("Unable to open this receipt.");
    await Linking.openURL(result.signedUrl);
  }
  async function rejectPayment(t: Transaction) {
    setBusy(true);
    try {
      check(await db().rpc("lj_reject_payment", { p_id: t.id, p_reason: rejectionReason.trim() }));
      setRejectingPayment("");
      setRejectionReason("");
      await load();
      s.notify("Bank transfer rejected. The original proof and audit history were preserved.");
    } finally {
      setBusy(false);
    }
  }
  async function recordPayment(
    a: Appointment,
    method: "cash" | "bank",
    reference: string,
    amount: number,
  ) {
    sounds.prepare("payment");
    if (demo) {
      const current = appointments.find((v) => v.id === a.id);
      if (!current || !["pending", "confirmed", "completed"].includes(current.status))
        throw new Error("This appointment cannot receive payment.");
      if (appointmentPayment(current, transactions).remaining !== amount)
        throw new Error("The balance changed. Reopen this appointment.");
      const timestamp = new Date().toISOString();
      setTransactions((old) => [
        ...old.map((v) =>
          v.appointment_id === a.id && v.status === "pending" ? { ...v, status: "voided" } : v,
        ),
        {
          id: "demo-receipt-" + Date.now(),
          customer_id: a.customer_id || null,
          appointment_id: a.id,
          purchase_id: null,
          amount,
          method,
          reference,
          status: "verified",
          created_at: timestamp,
          received_at: timestamp,
        },
      ]);
      setAppointments((old) =>
        old.map((v) =>
          v.id === a.id
            ? { ...v, deposit_paid: true, status: v.status === "pending" ? "confirmed" : v.status }
            : v,
        ),
      );
    } else {
      const receipt = check(
        await db().rpc("lj_complete_appointment_payment", {
          p_id: a.id,
          p_method: method,
          p_reference: reference,
          p_expected_balance: amount,
        }),
      );
      if (receipt?.already_paid) {
        setPaymentAppointment(null);
        s.notify("Payment is already recorded.");
        await load();
        return;
      }
      await load();
    }
    setPaymentAppointment(null);
    sounds.play("payment", a.id);
    setPaymentCelebration(Date.now());
    setFeedback({ id: Date.now(), message: "Payment Received", duration: 7000 });
  }
  async function complete(a: Appointment, status: string) {
    if (demo) setAppointments((old) => old.map((v) => (v.id === a.id ? { ...v, status } : v)));
    else {
      check(await db().from("lj_calendar").update({ status }).eq("id", a.id).select("id").single());
      await load();
    }
    if (status === "completed") {
      sounds.play("service", a.id);
      const choices = appreciationMessages.filter(
        (message) => message !== previousAppreciation.current,
      );
      const message = choices[Math.floor(Math.random() * choices.length)];
      previousAppreciation.current = message;
      setFeedback({ id: Date.now(), message, duration: 10000 });
    } else s.notify("Appointment marked " + status.replace("_", " ") + ".");
  }

  if (!s.authReady && !demo)
    return (
      <SafeAreaView
        edges={{ top: "additive", bottom: "additive", left: "additive", right: "additive" }}
        style={{ flex: 1, backgroundColor: c.background, justifyContent: "center" }}
      >
        <ActivityIndicator color={c.brandAccent} />
      </SafeAreaView>
    );
  if (!allowed)
    return (
      <SafeAreaView
        edges={{ top: "additive", bottom: "additive", left: "additive", right: "additive" }}
        style={{ flex: 1, backgroundColor: c.background, padding: 30, justifyContent: "center" }}
      >
        <Card style={{ gap: 22, maxWidth: 550, alignSelf: "center" }}>
          <OT size={30}>Owner sign-in</OT>
          <OT>Only the verified salon owner can open the administrative workspace.</OT>
          {devOwnerAutoSignIn && (
            <OA
              label="Continue as Development Test Owner"
              onPress={() =>
                void s.signInDevOwner().catch((e) =>
                  s.notify(e instanceof Error ? e.message : "Development sign-in failed."),
                )
              }
            />
          )}
          <OA label="Owner Sign-In" onPress={() => go("owner-login")} />
          <OA label="Back to Business" secondary centered onPress={() => go("home")} />
        </Card>
      </SafeAreaView>
    );
  const canDiscount = (kind: "appointment" | "purchase", id: string, status: string) => {
    const linked = transactions.filter(
      (t) => (kind === "appointment" ? t.appointment_id : t.purchase_id) === id,
    );
    if (kind === "purchase")
      return status === "pending" && !linked.some((t) => t.status !== "pending");
    const appointment = appointments.find((a) => a.id === id);
    const received = linked
      .filter((t) => t.status === "verified")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return (
      !!appointment &&
      ["pending", "confirmed", "completed"].includes(status) &&
      !linked.some((t) => ["retained", "refund_due", "refunded"].includes(t.status)) &&
      (received < appointment.total || appointment.total === 0)
    );
  };
  async function applyPersonalDiscount(percentage: number) {
    if (!discountTarget) return;
    const { kind, record } = discountTarget;
    if (!demo) {
      check(
        await db().rpc(
          kind === "appointment" ? "lj_discount_appointment" : "lj_apply_order_discount",
          kind === "appointment"
            ? { p_id: record.id, p_percentage: percentage, p_expected_total: record.total }
            : { p_kind: kind, p_id: record.id, p_percentage: percentage },
        ),
      );
      await load();
    } else {
      const items =
        discountTarget.kind === "appointment"
          ? discountTarget.record.services.map((v) => ({ ...v, quantity: 1 }))
          : discountTarget.record.items;
      const discounted = items.map((v) => ({
        ...v,
        original_price: Number(v.original_price ?? v.price),
        price: Math.round(Number(v.original_price ?? v.price) * (1 - percentage / 100) * 100) / 100,
        discount_percentage: percentage,
      }));
      const subtotal = discounted.reduce((n, v) => n + v.price * v.quantity, 0);
      const original = discounted.reduce((n, v) => n + v.original_price * v.quantity, 0);
      const fee =
        discountTarget.kind === "purchase"
          ? Number(
              discountTarget.record.delivery_fee ??
                Math.max(
                  0,
                  record.total - items.reduce((n, v) => n + Number(v.price) * v.quantity, 0),
                ),
            )
          : 0;
      const received =
        kind === "appointment"
          ? transactions
              .filter((t) => t.appointment_id === record.id && t.status === "verified")
              .reduce((sum, t) => sum + Number(t.amount), 0)
          : 0;
      const total = subtotal + fee;
      if (total < received)
        throw new Error(
          "This discount would reduce the total below money already received. A separate refund review is required.",
        );
      const deposit =
        received > 0 && discountTarget.kind === "appointment"
          ? discountTarget.record.deposit
          : Math.round(subtotal * 50) / 100;
      if (kind === "appointment")
        setAppointments((old) =>
          old.map((v) =>
            v.id === record.id
              ? {
                  ...v,
                  services: discounted,
                  total,
                  deposit,
                  discount_total: original - subtotal,
                  promo_code: null,
                }
              : v,
          ),
        );
      else
        setPurchases((old) =>
          old.map((v) =>
            v.id === record.id
              ? {
                  ...v,
                  items: discounted as Purchase["items"],
                  total,
                  delivery_fee: fee,
                  discount_total: original - subtotal,
                  promo_code: null,
                }
              : v,
          ),
        );
      setTransactions((old) =>
        old.map((t) =>
          (kind === "appointment" ? t.appointment_id : t.purchase_id) === record.id &&
          t.status === "pending"
            ? {
                ...t,
                amount:
                  kind === "appointment" ? (received > 0 ? total - received : deposit) : total,
              }
            : t,
        ),
      );
    }
    s.notify(
      demo
        ? "Discount applied."
        : "Discount applied. Recorded receipts are unchanged and the balance is updated.",
    );
  }
  const reviewCustomPrice = async (appointment: Appointment, approve: boolean) => {
    setBusy(true);
    setError("");
    try {
      check(
        await db().rpc("lj_review_custom_service", {
          p_id: appointment.id,
          p_approve: approve,
          p_custom_price: approve ? Number(customPrices[appointment.id]) : null,
        }),
      );
      await load();
      s.notify(
        approve
          ? "Custom price approved. Payment remains outstanding."
          : "Custom-price request declined.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to review custom pricing.");
    } finally {
      setBusy(false);
    }
  };
  const reviewVipRequest = async (appointment: Appointment, approve: boolean) => {
    setBusy(true);
    setError("");
    try {
      if (demo) {
        setAppointments((current) =>
          current.map((item) =>
            item.id === appointment.id
              ? {
                  ...item,
                  approval_status: approve ? "approved" : "declined",
                  status: approve ? item.status : "cancelled",
                }
              : item,
          ),
        );
      } else {
        check(
          await db().rpc("lj_review_vip_request", {
            p_id: appointment.id,
            p_approve: approve,
          }),
        );
        await load();
      }
      s.notify(
        approve ? "VIP request approved. Payment remains outstanding." : "VIP request declined.",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : `Unable to ${approve ? "approve" : "decline"} VIP request.`,
      );
    } finally {
      setBusy(false);
    }
  };
  const renderAppointment = (a: Appointment) => (
    <AppointmentCard
      key={a.id}
      appointment={a}
      transactions={transactions}
      name={nameFor(a.customer_id, a.client_id)}
      expanded={expandedAppointment === a.id}
      onToggle={() => setExpandedAppointment(expandedAppointment === a.id ? "" : a.id)}
    >
      {a.custom_approval && a.approval_status === "pending" && (
        <View style={{ gap: 10 }}>
          <OT bold>Custom detangling price requested</OT>
          <OT muted>Confirm the final price before the client is asked to pay.</OT>
          <OF
            label="Approved Price"
            keyboardType="default"
            value={customPrices[a.id] || ""}
            onChange={(value) => setCustomPrices((current) => ({ ...current, [a.id]: value }))}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <OA
                fill
                compact
                label="Decline"
                secondary
                disabled={busy || demo}
                onPress={() => void reviewCustomPrice(a, false)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <OA
                fill
                compact
                label="Approve Price"
                accent
                disabled={busy || demo || !/^\d+(?:\.\d{1,2})?$/.test(customPrices[a.id] || "")}
                onPress={() => void reviewCustomPrice(a, true)}
              />
            </View>
          </View>
        </View>
      )}
      {a.is_vip && a.approval_status === "pending" && (
        <View style={{ gap: 10 }}>
          <OT bold>
            VIP request · +{a.vip_percentage}% · {money(a.vip_premium || 0)} premium
          </OT>
          <OT muted>
            Requested time: {dateLabel(a.starts_at, { year: "numeric" })} at{" "}
            {timeLabel(a.starts_at)}
          </OT>
          <OT bold>Reason: {a.vip_reason || "No reason supplied"}</OT>
          <OT muted>Pending owner approval. Payment has not been collected.</OT>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <OA
                fill
                label="Approve"
                accent
                disabled={busy}
                onPress={() => void reviewVipRequest(a, true)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <OA
                fill
                label="Decline"
                secondary
                disabled={busy}
                onPress={() => {
                  setConfirm({
                    text: "Decline this VIP request?",
                    detail: "The requested appointment will not be approved or charged.",
                    actionLabel: "Decline VIP Request",
                    cancelLabel: "Keep request",
                    run: () => reviewVipRequest(a, false),
                  });
                }}
              />
            </View>
          </View>
        </View>
      )}
      {a.kind === "appointment" &&
        transactions
          .filter((transaction) => transaction.appointment_id === a.id)
          .map((transaction) => (
            <Card key={transaction.id} style={{ padding: 14, gap: 8, backgroundColor: c.muted }}>
              <OT bold>
                Deposit {money(transaction.amount)} · {transaction.status}
              </OT>
              <OT muted>Bank transfer · Reference: {transaction.reference || "Not supplied"}</OT>
              <OT muted>
                Payment Date:{" "}
                {transaction.payment_date
                  ? dateLabel(transaction.payment_date + "T12:00:00Z", { year: "numeric" })
                  : "Not supplied"}
              </OT>
              {!!transaction.receipt_path && (
                <OA
                  compact
                  secondary
                  fill
                  label="View Payment Receipt"
                  icon="ReceiptText"
                  onPress={() =>
                    void openPaymentReceipt(transaction).catch((e) => setError(e.message))
                  }
                />
              )}
            </Card>
          ))}
      {a.kind === "appointment" && <AppointmentAgreement appointmentId={a.id} />}
      {a.kind === "appointment" && (
        <OA
          fill
          label="Message Client"
          icon="MessageCircle"
          secondary
          onPress={() => {
            const contact = clients.find(
              (v) => v.id === a.client_id || (!!a.customer_id && v.customer_id === a.customer_id),
            );
            setContactActions({
              name: contact?.full_name || nameFor(a.customer_id, a.client_id),
              whatsapp: contact?.whatsapp_phone,
              phone: contact?.phone,
              message:
                "Hello " +
                (contact?.first_name || contact?.full_name || "") +
                ", about your Lady J appointment on " +
                dateLabel(a.starts_at) +
                ": ",
            });
          }}
        />
      )}
      {a.kind === "appointment" && (
        <OA
          fill
          label="Add Photo or Video"
          icon="Images"
          secondary
          onPress={() => {
            const contact = clients.find(
              (v) => v.id === a.client_id || (!!a.customer_id && v.customer_id === a.customer_id),
            );
            if (!contact) {
              s.notify("Link this appointment to a saved client before adding photos or videos.");
              return;
            }
            setMediaContext({ mode: "upload", clientId: contact.id, appointmentId: a.id });
          }}
        />
      )}
      {a.kind === "appointment" && ["pending", "confirmed", "completed"].includes(a.status) && (
        <OA
          fill
          label="Custom Discount"
          secondary
          disabled={!canDiscount("appointment", a.id, a.status)}
          icon="Gift"
          onPress={() => setDiscountTarget({ kind: "appointment", record: a })}
        />
      )}
      {a.kind === "appointment" &&
        a.approval_status !== "pending" &&
        ["pending", "confirmed"].includes(a.status) && (
          <View style={{ gap: 12 }}>
            <OA
              fill
              label="Service Complete"
              secondary
              onPress={() =>
                setConfirm({
                  text: "Complete this service?",
                  detail: "Payment is recorded separately.",
                  actionLabel: "Confirm Complete Service",
                  run: async () => {
                    setConfirm(null);
                    setCelebration(a);
                  },
                })
              }
            />
            <OA
              fill
              label="Cancel / No-Show"
              secondary
              onPress={() =>
                setConfirm({
                  text:
                    new Date(a.starts_at) > new Date()
                      ? "Cancel this appointment? Verified deposits follow the cancellation policy."
                      : "Mark as no-show? The verified deposit is forfeited.",
                  run: async () => {
                    if (new Date(a.starts_at) <= new Date()) await complete(a, "no_show");
                    else if (demo) {
                      setAppointments((old) =>
                        old.map((v) => (v.id === a.id ? { ...v, status: "cancelled" } : v)),
                      );
                      s.notify("Appointment cancelled.");
                    } else {
                      const message = check(await db().rpc("lj_cancel", { p_id: a.id }));
                      await load();
                      s.notify(message);
                    }
                  },
                })
              }
            />
          </View>
        )}
      {a.kind === "appointment" &&
        a.approval_status !== "pending" &&
        ["pending", "confirmed", "completed"].includes(a.status) && (
          <View style={{ gap: 12 }}>
            <OA
              fill
              payment
              label="Payment Complete"
              icon="Wallet"
              disabled={appointmentPayment(a, transactions).remaining <= 0}
              onPress={() => {
                setError("");
                setPaymentAppointment(a);
              }}
            />
            <OT muted>
              {appointmentPayment(a, transactions).remaining <= 0
                ? "The full payment is already recorded."
                : "Record money received. Service completion is separate."}
            </OT>
          </View>
        )}
      {a.kind === "block" && a.status !== "cancelled" && (
        <OA fill label="Delete Block" secondary onPress={() => editBlock(a)} />
      )}
    </AppointmentCard>
  );
  async function saveSelectedContact() {
    if (!selectedClient || !editingContact || busy) return;
    setError("");
    const fullName = String(selectedClient?.full_name ?? "").trim();
    const first_name = String(selectedClient?.first_name ?? fullName.split(" ")[0] ?? "").trim();
    const last_name = (selectedClient?.last_name ?? fullName.split(" ").slice(1).join(" ")).trim();
    const email = String(selectedClient?.email ?? "").trim();
    const phone = String(selectedClient?.phone ?? "").trim();
    if (!first_name || !last_name) {
      setError("Enter a first and last name.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    const values = {
      first_name,
      last_name,
      full_name: `${first_name} ${last_name}`,
      email,
      phone,
      private_notes: selectedClient.private_notes,
    };
    setBusy(true);
    try {
      if (!demo)
        check(
          await db()
            .from("lj_client_records")
            .update(values)
            .eq("id", selectedClient.id)
            .select("id")
            .single(),
        );
      const contact = { ...selectedClient, ...values };
      setClients((old) => old.map((v) => (v.id === contact.id ? { ...v, ...values } : v)));
      setSelectedClient(contact);
      setEditingContact(false);
      s.notify("Client saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save client.");
    } finally {
      setBusy(false);
    }
  }
  async function runConfirmedAction() {
    if (!confirm || busy) return;
    if (confirm.actionLabel === "Confirm complete service") sounds.prepare("service");
    setBusy(true);
    setError("");
    try {
      await confirm.run();
      setConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete the action.");
    } finally {
      setBusy(false);
    }
  }
  function openBusiness(value: string) {
    setTab("Business");
    setSection(value);
  }
  function editBlock(block: Appointment) {
    setError("");
    setEditingBlock(block);
    setInitialBlockReason(block.block_reason || "personal");
    setStart(localCalendarTime(block.starts_at));
    setCalendarForm("block");
  }
  function deleteBlock(block: Appointment) {
    setError("");
    setConfirm({
      text: "Delete this blocked time?",
      actionLabel: "Delete block",
      cancelLabel: "Keep block",
      run: async () => {
        if (demo) setAppointments((old) => old.filter((a) => a.id !== block.id));
        else {
          check(
            await db().rpc("lj_delete_calendar_block", {
              p_id: block.id,
              p_scope: "one",
              p_expected: block.updated_at,
            }),
          );
          await load(true);
        }
        setCalendarForm(null);
        setEditingBlock(null);
        s.notify(demo ? "Block deleted. Time is available." : "Block deleted. Time is available.");
      },
    });
  }
  function ownerAction(action: OwnerAction) {
    setError("");
    if (action === "appointment" || action === "block") {
      setEditingBlock(null);
      setInitialBlockReason("personal");
      setServiceId("");
      setCustomerId("");
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setNote("");
      setStart((tab === "Calendar" ? calendarDate : todayKey()) + "T10:00");
      setCalendarForm(action);
      return;
    }
    if (action === "client") {
      openEditor("lj_client_records");
      return;
    }
    if (action === "workshop") {
      openEditor("lj_workshops");
      return;
    }
    if (action === "product") {
      openEditor("lj_products");
      return;
    }
    if (action === "maria") {
      setTab("Maria");
      return;
    }
    openBusiness(action === "payments" ? "Payments" : "Revenue");
  }
  return (
    <OwnerWorkspace
      onAction={() => setFeedback(null)}
      tab={tab}
      onTab={(value) => {
        if (value === "Calendar") setCalendarSelected(false);
        setNavigationRevision((old) => old + 1);
        if (!demo) void load(true);
        setTab(value);
        setSection("Overview");
      }}
      demo={demo}
      devOwner={s.devOwner}
      onSalon={() => go("home")}
      onAdd={() => ownerAction("appointment")}
    >
      {tab === "Today" ? (
        loading ? (
          <ActivityIndicator color={c.tertiary} />
        ) : (
          <TodayDashboard
            key={navigationRevision}
            activities={activitiesOnDate(appointments, todayDate)}
            day={todayDate}
            onAdd={() => ownerAction("appointment")}
            onRefresh={refreshWorkspace}
            briefing={<TodayPreparation today={today} services={services} nameFor={nameFor} />}
            notice={
              !!error && !editor && !calendarForm ? (
                <ErrorBox message={error} retry={() => void load()} />
              ) : undefined
            }
            renderAppointment={(activity) =>
              activity.kind === "block" ? (
                <BlockActivityCard block={activity} onEdit={() => editBlock(activity)} />
              ) : (
                renderAppointment(activity)
              )
            }
          />
        )
      ) : tab === "Calendar" ? (
        <CalendarDashboard
          key={navigationRevision}
          date={calendarDate}
          selected={calendarSelected}
          onClear={() => setCalendarSelected(false)}
          view={calendarView}
          onDate={(date) => {
            setCalendarDate(date);
            setCalendarSelected(true);
            setCalendarView("Day");
          }}
          onView={setCalendarView}
          onAdd={() => ownerAction("appointment")}
          onBlock={(reason) => {
            ownerAction("block");
            setInitialBlockReason(reason);
          }}
          onEditBlock={editBlock}
          appointments={appointments}
          live={allowed && !demo}
          status={calendarSync}
          error={error}
          onRefresh={refreshWorkspace}
          renderAppointment={renderAppointment}
        />
      ) : tab === "Clients" ? (
        loading ? (
          <ActivityIndicator color={c.tertiary} />
        ) : (
          <ClientsPanel
            key={navigationRevision}
            clients={clients}
            error={error}
            onRetry={() => void load()}
            profiles={profiles}
            demo={demo}
            onAdd={() => openEditor("lj_client_records")}
            onClient={setSelectedClient}
            onProfile={(profile) =>
              openEditor("lj_client_records", {
                customer_id: profile.id,
                full_name: profile.full_name,
                phone: profile.phone,
                email: "",
                preferences: profile.preferences || "",
                private_notes: "",
                sensitivities: "",
                photo_consent: false,
              })
            }
          />
        )
      ) : (
        <ScrollView
          ref={catalogScroll}
          key={tab + ":" + section + ":" + navigationRevision}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshWorkspace()}
              tintColor={c.tertiary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: width >= 1100 ? 32 : 20,
            paddingBottom: Math.max(50, navigationSpacing + 20),
          }}
        >
          <View style={[shared.responsive, { maxWidth: 1200 }]}>
            {tab !== "Today" &&
              tab !== "Calendar" &&
              !(
                tab === "Business" &&
                [
                  "Overview",
                  "Revenue",
                  "Reports",
                  "Settings",
                  "VendorManagement",
                  "Consultations",
                  "Balances",
                  "Expenses",
                  "Waitlist",
                  "Specials",
                  "Backbar",
                  "Royalty",
                  "GiftsReferrals",
                  "Agreements",
                  "Discounts",
                  "Automation",
                ].includes(section)
              ) && (
                <View style={{ marginBottom: 26 }}>
                  <OT size={32} bold centered>
                    {tab === "Today"
                      ? "A beautiful day ahead."
                      : tab === "Calendar"
                        ? "Your time, thoughtfully planned."
                        : tab === "Clients"
                          ? "Care starts with knowing."
                          : tab === "Maria"
                            ? "Meet Maria."
                            : section === "Overview"
                              ? "Your business, beautifully organised."
                              : section}
                  </OT>
                  {tab === "Maria" && (
                    <OT muted centered>Your private English–Spanish assistant.</OT>
                  )}
                </View>
              )}
            {!!error && !editor && !calendarForm && (
              <ErrorBox message={error} retry={() => void load()} />
            )}
            {loading ? (
              <ActivityIndicator color={c.brandAccent} />
            ) : (
              <>
                {tab === "Business" && (
                  <>
                    {section !== "Overview" && section !== "VendorManagement" && (
                      <View style={{ marginBottom: 24, alignItems: "center" }}>
                        <OA
                          label="Back to Business"
                          icon="ChevronLeft"
                          secondary
                          compact
                          centered
                          onPress={() => setSection("Overview")}
                        />
                      </View>
                    )}
                    {section === "Reports" && (
                      <DownloadReports
                        purchases={purchases}
                        services={services}
                        appointments={appointments}
                        transactions={transactions}
                        products={products}
                        clients={clients}
                        demo={demo}
                      />
                    )}
                    {section === "Consultations" && (
                      <ConsultationRequestsPanel
                        services={services}
                        appointments={appointments}
                        demo={demo}
                        focusId={routeParams.consultation}
                        onChanged={() => load(true)}
                      />
                    )}
                    {section === "Approvals" && (
                      <View style={{ gap: 18 }}>
                        <OT size={24} bold>
                          VIP Appointments
                        </OT>
                        {appointments
                          .filter((a) => a.is_vip && a.approval_status === "pending")
                          .map(renderAppointment)}
                        {!appointments.some((a) => a.is_vip && a.approval_status === "pending") && (
                          <OT muted>No VIP approvals waiting.</OT>
                        )}
                        <OT size={24} bold>
                          Consultation Requests
                        </OT>
                        <ConsultationRequestsPanel
                          services={services}
                          appointments={appointments}
                          demo={demo}
                          focusId={routeParams.consultation}
                          onChanged={() => load(true)}
                        />
                      </View>
                    )}
                    {section === "Expenses" && (
                      <ExpensesPanel
                        demo={demo}
                        transactions={transactions}
                        appointments={appointments}
                        purchases={purchases}
                      />
                    )}
                    {section === "Waitlist" && (
                      <WaitlistPanel
                        entries={waiting}
                        clients={clients}
                        demo={demo}
                        onRefresh={refreshWorkspace}
                      />
                    )}
                    {section === "Balances" && (
                      <View style={{ gap: 18 }}>
                        <OT size={28} bold>
                          Balances after completed visits
                        </OT>
                        <OT muted>
                          Record money only after you receive it. Completing a service never settles
                          its balance automatically.
                        </OT>
                        {appointments
                          .filter(
                            (a) =>
                              a.kind === "appointment" &&
                              a.status === "completed" &&
                              appointmentPayment(a, transactions).remaining > 0,
                          )
                          .map((a) => (
                            <Card key={a.id} style={{ gap: 12 }}>
                              <OT bold>{nameFor(a.customer_id, a.client_id)}</OT>
                              <OT>
                                {dateLabel(a.starts_at)} ·{" "}
                                {money(appointmentPayment(a, transactions).remaining)} remaining
                              </OT>
                              <OA
                                label="Record Money Received"
                                icon="Wallet"
                                onPress={() => setPaymentAppointment(a)}
                              />
                            </Card>
                          ))}
                        {!appointments.some(
                          (a) =>
                            a.kind === "appointment" &&
                            a.status === "completed" &&
                            appointmentPayment(a, transactions).remaining > 0,
                        ) && (
                          <Card>
                            <OT muted>All completed visits in the loaded records are settled.</OT>
                          </Card>
                        )}
                      </View>
                    )}
                    {section === "Specials" && (
                      <SpecialsPanel
                        services={services}
                        demo={demo}
                        onSaved={load}
                        onDemoDelete={(id) =>
                          setServices((old) => old.filter((service) => service.id !== id))
                        }
                        onDemoSave={(service) =>
                          setServices((old) => [...old.filter((v) => v.id !== service.id), service])
                        }
                      />
                    )}
                    {section === "Backbar" && (
                      <BackbarPanel
                        services={services}
                        demo={demo}
                        onBack={() => setSection("Overview")}
                      />
                    )}
                    {section === "VendorManagement" && (
                      <VendorSpendingPanel demo={demo} onBack={() => setSection("Overview")} />
                    )}
                    {section === "Overview" && (
                      <View style={{ gap: 10 }}>
                        <DailyBriefing
                          items={[...attention].sort((a, b) => {
                            const rank = (key: string) =>
                              key === "payments" ? 0 : key === "stock" ? 1 : 2;
                            return rank(a.key) - rank(b.key);
                          })}
                          onOpen={(item) => {
                            setLowStockOnly(item.key === "stock");
                            openBusiness(item.section);
                          }}
                        />
                        <BusinessOverview
                          onOpen={setSection}
                          onMedia={() => setMediaContext({ mode: "gallery" })}
                          urgentApproval={appointments.some(
                            (a) => a.is_vip && a.approval_status === "pending",
                          )}
                        />
                      </View>
                    )}
                    {["Services", "Products", "Workshops"].includes(section) && (
                      <>
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <OA
                              fill
                              compact
                              label={
                                section === "Services"
                                  ? "Add Service"
                                  : section === "Products"
                                    ? "Add Product"
                                    : "Create Workshop"
                              }
                              icon="Plus"
                              onPress={() =>
                                openEditor(
                                  section === "Services"
                                    ? "lj_services"
                                    : section === "Products"
                                      ? "lj_products"
                                      : "lj_workshops",
                                )
                              }
                            />
                          </View>
                          {section === "Services" && (
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <OA
                                fill
                                compact
                                label="Create Special"
                                icon="Gift"
                                onPress={() => setSection("Specials")}
                              />
                            </View>
                          )}
                        </View>
                        {section === "Services" && (
                          <View style={{ marginTop: 12 }}>
                            <ServiceCategories
                              booking
                              value={ownerCatalogCategory}
                              onChange={setOwnerCatalogCategory}
                              interactiveArrows
                            />
                          </View>
                        )}
                        {section === "Products" && (
                          <View style={{ marginTop: 18, gap: 10 }}>
                            <OA
                              label={lowStockOnly ? "Show all products" : "Show low-stock products"}
                              secondary
                              onPress={() => setLowStockOnly(!lowStockOnly)}
                            />
                            {lowStockOnly && !products.some(isLowStock) && (
                              <OT muted>No active products are below their stock alert level.</OT>
                            )}
                          </View>
                        )}
                        <View style={{ height: 20 }} />
                        <View accessibilityLiveRegion="polite" style={{ marginBottom: 18 }}>
                          <OT muted>
                            {catalogItems.length} {section.toLowerCase()}
                          </OT>
                        </View>
                        {catalogItems
                          .slice(currentCatalogPage * 12, currentCatalogPage * 12 + 12)
                          .map((v) =>
                            section === "Services" || section === "Products" ? (
                              <Card
                                key={v.id}
                                style={{
                                  minHeight: section === "Services" ? 88 : 90,
                                  marginBottom: 10,
                                  padding: 0,
                                  overflow: "hidden",
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <Photo
                                  name={v.image}
                                  style={{
                                    width: section === "Services" ? 88 : 80,
                                    height: section === "Services" ? 88 : 90,
                                    borderRadius: 10,
                                  }}
                                />
                                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                                  <Txt bold size={16} numberOfLines={1} ellipsizeMode="tail">
                                    {String(v.name)}
                                  </Txt>
                                  {section === "Services" && (
                                    <Txt size={12} color={c.mutedForeground} numberOfLines={1}>
                                      {String(v.description)}
                                    </Txt>
                                  )}
                                  <Txt size={12} color={c.mutedForeground} numberOfLines={1}>
                                    {section === "Services"
                                      ? serviceDurationLabel(v as Service) +
                                        " · " +
                                        servicePriceLabel(v as Service)
                                      : money(v.price) +
                                        " · " +
                                        ("stock" in v ? v.stock : 0) +
                                        " in stock"}
                                  </Txt>
                                </View>
                                <View style={{ paddingRight: 8 }}>
                                  <OA
                                    label="Edit Details"
                                    compact
                                    secondary
                                    onPress={() =>
                                      openEditor(
                                        section === "Services" ? "lj_services" : "lj_products",
                                        v as unknown as Row,
                                      )
                                    }
                                  />
                                </View>
                              </Card>
                            ) : (
                              <Card key={v.id} style={{ marginBottom: 16, gap: 14 }}>
                                <View
                                  style={{ flexDirection: "row", gap: 18, alignItems: "center" }}
                                >
                                  <Photo
                                    name={v.image}
                                    style={{ width: 80, height: 90, borderRadius: 10 }}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <OT size={23} bold>
                                      {String(v.name)}
                                    </OT>
                                    <OT muted>
                                      {"duration" in v
                                        ? servicePriceLabel(v as Service)
                                        : money(v.price)}{" "}
                                      ·
                                      {"stock" in v
                                        ? `${v.stock} in stock`
                                        : "duration" in v
                                          ? serviceDurationLabel(v as Service)
                                          : ""}
                                      {"is_add_on" in v && v.is_add_on
                                        ? " · Add-on"
                                        : "bookable" in v && v.bookable === false
                                          ? " · Not bookable"
                                          : !v.active
                                            ? " · Archived"
                                            : ""}
                                    </OT>
                                  </View>
                                </View>
                                <View style={[shared.row, { flexWrap: "wrap" }]}>
                                  <OA
                                    label="Edit Details"
                                    secondary
                                    onPress={() =>
                                      openEditor(
                                        section === "Services"
                                          ? "lj_services"
                                          : section === "Products"
                                            ? "lj_products"
                                            : "lj_workshops",
                                        v as unknown as Row,
                                      )
                                    }
                                  />
                                  {section === "Workshops" && (
                                    <>
                                      <OA
                                        label="Resources"
                                        secondary
                                        onPress={() => {
                                          if (demo)
                                            openEditor(
                                              "lj_workshop_resources",
                                              demoResources[v.id] || { workshop_id: v.id },
                                            );
                                          else
                                            void db()
                                              .from("lj_workshop_resources")
                                              .select("*")
                                              .eq("workshop_id", v.id)
                                              .maybeSingle()
                                              .then((r) => {
                                                if (r.error) setError(r.error.message);
                                                else
                                                  openEditor(
                                                    "lj_workshop_resources",
                                                    r.data || { workshop_id: v.id },
                                                  );
                                              });
                                        }}
                                      />
                                      <OA
                                        label="Enrollment"
                                        secondary
                                        onPress={() => {
                                          setSection("Enrollment");
                                          setEnrollmentWorkshopId(v.id);
                                        }}
                                      />
                                    </>
                                  )}
                                </View>
                              </Card>
                            ),
                          )}
                        {catalogPages > 1 && (
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 14,
                            }}
                          >
                            <OA
                              label="Previous"
                              compact
                              secondary
                              disabled={currentCatalogPage === 0}
                              onPress={() => setCatalogPage(currentCatalogPage - 1)}
                            />
                            <OT size={16}>
                              {currentCatalogPage + 1} / {catalogPages}
                            </OT>
                            <OA
                              label="Next"
                              compact
                              secondary
                              disabled={currentCatalogPage === catalogPages - 1}
                              onPress={() => setCatalogPage(currentCatalogPage + 1)}
                            />
                          </View>
                        )}
                        <View style={{ alignItems: "center", marginTop: 18 }}>
                          <OA
                            label="Back to Business"
                            icon="ChevronLeft"
                            secondary
                            centered
                            onPress={() => setSection("Overview")}
                          />
                        </View>
                      </>
                    )}
                    {section === "Enrollment" && (
                      <>
                        <OA
                          label="Back to Workshops"
                          secondary
                          centered
                          onPress={() => setSection("Workshops")}
                        />
                        <View style={{ height: 20 }} />
                        {purchases.filter(
                          (p) =>
                            p.kind === "workshop" &&
                            p.items.some((v) => v.id === enrollmentWorkshopId),
                        ).length ? (
                          purchases
                            .filter(
                              (p) =>
                                p.kind === "workshop" &&
                                p.items.some((v) => v.id === enrollmentWorkshopId),
                            )
                            .map((p) => (
                              <Card key={p.id} style={{ marginBottom: 15, gap: 10 }}>
                                <OT bold>{nameFor(p.customer_id)}</OT>
                                <OT>
                                  {p.status} · {money(p.total)}
                                </OT>
                                {canDiscount("purchase", p.id, p.status) && (
                                  <OA
                                    label="Apply Discount"
                                    secondary
                                    icon="Gift"
                                    onPress={() =>
                                      setDiscountTarget({ kind: "purchase", record: p })
                                    }
                                  />
                                )}
                                {Number(p.discount_total) > 0 && (
                                  <OT>Discount applied: {money(p.discount_total!)}</OT>
                                )}
                                <OT muted>
                                  {attendance.find((v) => v.purchase_id === p.id)?.attended
                                    ? "Attendance recorded"
                                    : "Attendance not recorded"}
                                </OT>
                                {["paid", "fulfilled"].includes(p.status) && (
                                  <OA
                                    label="Attendance & Certificate"
                                    secondary
                                    onPress={() =>
                                      openEditor(
                                        "lj_attendance",
                                        attendance.find((v) => v.purchase_id === p.id) || {
                                          purchase_id: p.id,
                                          customer_id: p.customer_id,
                                        },
                                      )
                                    }
                                  />
                                )}
                              </Card>
                            ))
                        ) : (
                          <Card>
                            <OT>No enrollments yet.</OT>
                          </Card>
                        )}
                      </>
                    )}
                    {section === "Orders" &&
                      (purchases.filter((v) => v.kind === "product").length ? (
                        purchases
                          .filter((v) => v.kind === "product")
                          .map((p) => (
                            <Card key={p.id} style={{ marginBottom: 16, gap: 14 }}>
                              <OT bold size={22}>
                                {p.order_number || `Order ${p.id.slice(0, 8).toUpperCase()}`}
                              </OT>
                              <OT bold size={18}>
                                {(Array.isArray(p.items) ? p.items : [])
                                  .map(
                                    (v) =>
                                      `${String(v?.name ?? "Item")} × ${Number(v?.quantity) || 0}`,
                                  )
                                  .join(", ")}
                              </OT>
                              <OT>
                                {p.contact_name || nameFor(p.customer_id)} · {money(p.total)} ·{" "}
                                {p.fulfillment}
                              </OT>
                              {!!p.contact_email && (
                                <OT muted>
                                  {p.contact_email} · {p.contact_phone || "No phone supplied"}
                                </OT>
                              )}
                              <OT muted>
                                Payment: {(p.payment_status || p.status).replaceAll("_", " ")} ·
                                Fulfillment:{" "}
                                {(p.fulfillment_status || p.status).replaceAll("_", " ")}
                              </OT>
                              {canDiscount("purchase", p.id, p.status) && (
                                <OA
                                  label="Apply Discount"
                                  secondary
                                  icon="Gift"
                                  onPress={() => setDiscountTarget({ kind: "purchase", record: p })}
                                />
                              )}
                              {Number(p.discount_total) > 0 && (
                                <OT>Discount applied: {money(p.discount_total!)}</OT>
                              )}
                              {!!p.delivery_address && <OT>Delivery: {p.delivery_address}</OT>}
                              {(p.payment_status === "verified" ||
                                ["paid", "processing", "ready"].includes(p.status)) &&
                                ["pending", "processing", "ready"].includes(
                                  p.fulfillment_status ||
                                    (p.status === "paid" ? "pending" : p.status),
                                ) && (
                                  <OA
                                    label={
                                      (p.fulfillment_status ||
                                        (p.status === "paid" ? "pending" : p.status)) === "pending"
                                        ? "Start processing"
                                        : (p.fulfillment_status || p.status) === "processing"
                                          ? "Mark ready"
                                          : "Mark fulfilled"
                                    }
                                    onPress={() =>
                                      setConfirm({
                                        text: "Update this order’s fulfillment status?",
                                        run: async () => {
                                          const status =
                                            (p.fulfillment_status ||
                                              (p.status === "paid" ? "pending" : p.status)) ===
                                            "pending"
                                              ? "processing"
                                              : (p.fulfillment_status || p.status) === "processing"
                                                ? "ready"
                                                : "fulfilled";
                                          if (demo)
                                            setPurchases((old) =>
                                              old.map((v) =>
                                                v.id === p.id
                                                  ? { ...v, status, fulfillment_status: status }
                                                  : v,
                                              ),
                                            );
                                          else {
                                            check(
                                              await db()
                                                .from("lj_purchases")
                                                .update({ status, fulfillment_status: status })
                                                .eq("id", p.id),
                                            );
                                            await load();
                                          }
                                          s.notify("Order status updated.");
                                        },
                                      })
                                    }
                                  />
                                )}
                            </Card>
                          ))
                      ) : (
                        <Card>
                          <OT>
                            No boutique orders yet. Paid orders can be processed, marked ready and
                            fulfilled here.
                          </OT>
                        </Card>
                      ))}
                    {section === "Payments" &&
                      (transactions.length ? (
                        transactions.map((t) => (
                          <Card key={t.id} style={{ marginBottom: 17, gap: 13 }}>
                            <OT size={24} bold>
                              {money(t.amount)} · {t.status}
                            </OT>
                            <OT>{nameFor(t.customer_id)}</OT>
                            <OT muted>
                              {t.method === "bank" ? "Bank transfer" : t.method} · Reference:{" "}
                              {t.reference || "Not supplied"}
                            </OT>
                            <OT muted>
                              Payment Date:{" "}
                              {t.payment_date
                                ? dateLabel(t.payment_date + "T12:00:00Z", { year: "numeric" })
                                : "Not supplied"}
                            </OT>
                            {!!t.receipt_path && (
                              <OA
                                label="View Proof"
                                icon="ReceiptText"
                                secondary
                                onPress={() =>
                                  void openPaymentReceipt(t).catch((e) => setError(e.message))
                                }
                              />
                            )}
                            {!!t.rejection_reason && (
                              <OT muted>Rejection Reason: {t.rejection_reason}</OT>
                            )}
                            <OT muted>{dateLabel(t.created_at)}</OT>
                            {t.status === "pending" && (
                              <View style={{ gap: 10 }}>
                                <OA
                                  label="Confirm Payment"
                                  icon="ShieldCheck"
                                  onPress={() =>
                                    setConfirm({
                                      text: `Confirm you have received ${money(t.amount)} in your bank account. Uploaded proof alone does not prove payment.`,
                                      run: () => verify(t),
                                    })
                                  }
                                />
                                {rejectingPayment === t.id ? (
                                  <View style={{ gap: 8 }}>
                                    <OF
                                      label="Rejection Reason"
                                      value={rejectionReason}
                                      onChange={setRejectionReason}
                                      multiline
                                    />
                                    <OA
                                      label={busy ? "Requesting" : "Request Correction"}
                                      secondary
                                      disabled={busy || rejectionReason.trim().length < 3}
                                      onPress={() =>
                                        void rejectPayment(t).catch((e) => setError(e.message))
                                      }
                                    />
                                    <OA
                                      label="Keep Pending"
                                      secondary
                                      onPress={() => {
                                        setRejectingPayment("");
                                        setRejectionReason("");
                                      }}
                                    />
                                  </View>
                                ) : (
                                  <OA
                                    label="Reject Transfer"
                                    icon="CircleX"
                                    secondary
                                    onPress={() => setRejectingPayment(t.id)}
                                  />
                                )}
                              </View>
                            )}

                            {t.status === "refund_due" && (
                              <>
                                <OT>
                                  Process this refund with your bank first, then record it here.
                                </OT>
                                <OA
                                  label="Record Completed Refund"
                                  secondary
                                  onPress={() =>
                                    setConfirm({
                                      text: "Confirm the bank refund has actually been completed.",
                                      run: async () => {
                                        if (demo)
                                          setTransactions((old) =>
                                            old.map((v) =>
                                              v.id === t.id
                                                ? {
                                                    ...v,
                                                    status: "refunded",
                                                    refunded_at: new Date().toISOString(),
                                                  }
                                                : v,
                                            ),
                                          );
                                        else {
                                          check(await db().rpc("lj_record_refund", { p_id: t.id }));
                                          await load();
                                        }
                                        s.notify("Completed refund recorded.");
                                      },
                                    })
                                  }
                                />
                              </>
                            )}
                          </Card>
                        ))
                      ) : (
                        <Card>
                          <OT>No transactions yet.</OT>
                        </Card>
                      ))}
                    {section === "Revenue" && (
                      <RevenuePanel
                        transactions={transactions}
                        appointments={appointments}
                        products={products}
                        purchases={purchases}
                        demo={demo}
                      />
                    )}
                    {section === "Royalty" && (
                      <LoyaltySettings
                        demo={demo}
                        onMessageClient={(client) =>
                          setContactActions({
                            name: client.full_name,
                            whatsapp: client.whatsapp_phone,
                            phone: client.phone,
                            message: `Hello ${String(client?.full_name ?? "").split(" ")[0] || ""}, Lady J is thinking of you. `,
                          })
                        }
                      />
                    )}
                    {section === "GiftsReferrals" && <GiftsReferralsPanel demo={demo} />}
                    {section === "Agreements" && <AgreementList demo={demo} />}
                    {section === "Discounts" && (
                      <DiscountsPanel
                        demo={demo}
                        demoRows={demoDiscounts}
                        onDemoRows={setDemoDiscounts}
                        catalogs={{ service: services, product: products, workshop: workshops }}
                      />
                    )}
                    {section === "Promotions" && (
                      <View style={{ gap: 18 }}>
                        <OA
                          label="Create Promotion"
                          icon="Gift"
                          onPress={() => openEditor("lj_promotions")}
                        />
                        {(demo ? demoPromotions : s.promotions).map((v) => (
                          <Card key={String(v.id)} style={{ gap: 12 }}>
                            <OT size={23} bold>
                              {String(v.name)}
                            </OT>
                            <OT>{String(v.description)}</OT>
                            <OA
                              label="Edit Promotion"
                              secondary
                              onPress={() => openEditor("lj_promotions", v as unknown as Row)}
                            />
                          </Card>
                        ))}
                        <Card>
                          <OT>
                            Royalty redemptions remain client-directed. Birthday privileges and
                            Royalty service updates use the configured transactional email channel.
                          </OT>
                        </Card>
                      </View>
                    )}
                    {section === "Automation" && <CommunicationPanel demo={demo} />}
                    {section === "Settings" && (
                      <View style={{ gap: 24 }}>
                        <BusinessSettings
                          demo={demo}
                          settings={
                            (demo ? demoSettings || s.settings : s.settings) as unknown as
                              | import("@/lib/salon/types").Settings
                              | null
                          }
                          demoNotifications={demoNotifications}
                          onDemoNotifications={setDemoNotifications}
                          onDemoSave={(value) => setDemoSettings(value as unknown as Row)}
                          onSaved={() => load(true)}
                          sounds={sounds}
                          onBack={() => setSection("Overview")}
                        />
                        {!demo && (
                          <OA
                            label="Sign out securely"
                            secondary
                            onPress={() => {
                              s.setDemoOwner(false);
                              void signOutCurrentDevice()
                                .then(() => go("home"))
                                .catch((reason: unknown) =>
                                  s.notify(
                                    reason instanceof Error
                                      ? reason.message
                                      : "Unable to sign out.",
                                  ),
                                );
                            }}
                          />
                        )}
                      </View>
                    )}
                  </>
                )}
                {tab === "Maria" && (
                  <MariaPanel
                    demo={demo}
                    appointments={appointments}
                    clients={clients}
                    onChanged={() => void load()}
                    onAction={(action) => {
                      if (action.type === "tab") {
                        setTab(action.value || "Today");
                        setSection("Overview");
                      } else if (action.type === "business") {
                        openBusiness(action.value || "Overview");
                      } else if (action.type === "calendar") {
                        setTab("Calendar");
                        setCalendarDate(action.value || todayKey());
                        setCalendarSelected(true);
                        setCalendarView("Day");
                      } else if (action.type === "client") {
                        const client = clients.find((value) => value.id === action.value);
                        setTab("Clients");
                        if (client) setSelectedClient(client);
                      } else if (action.type === "appointment") {
                        const appointment = appointments.find((value) => value.id === action.value);
                        if (appointment) {
                          setTab("Calendar");
                          setCalendarDate(salonDayKey(appointment.starts_at));
                          setCalendarSelected(true);
                          setCalendarView("Day");
                          setExpandedAppointment(appointment.id);
                        } else {
                          ownerAction("appointment");
                        }
                      }
                    }}
                  />
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}
      {!!s.notice && <StatusNotice message={s.notice} onDismiss={() => s.notify("")} large />}
      {discountTarget && (
        <OrderDiscountDialog
          target={discountTarget}
          receivedAmount={
            discountTarget.kind === "appointment"
              ? appointmentPayment(discountTarget.record, transactions).received
              : 0
          }
          demo={demo}
          onClose={() => setDiscountTarget(null)}
          onSave={applyPersonalDiscount}
        />
      )}
      {mediaContext?.mode === "gallery" && (
        <ClientMediaGallery
          key={(s.session?.user.id || "demo") + ":" + (mediaContext.clientId || "all")}
          owner
          demo={demo}
          {...mediaContext}
          clients={clients}
          appointments={appointments}
          services={services}
          onClose={() => setMediaContext(null)}
        />
      )}
      {mediaContext?.mode === "upload" && (
        <MediaUpload
          key={(mediaContext.clientId || "") + ":" + (mediaContext.appointmentId || "")}
          minimal
          demo={demo}
          clients={clients}
          clientId={mediaContext.clientId}
          appointmentId={mediaContext.appointmentId}
          appointments={appointments}
          services={services}
          albums={[]}
          onClose={() => setMediaContext(null)}
          onDone={(complete) => {
            if (complete) {
              setMediaContext(null);
              s.notify("Photos and videos saved privately.");
            }
          }}
        />
      )}
      {!mediaContext &&
        (!!editor || !!calendarForm || !!selectedClient || !!confirm || !!paymentAppointment) && (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => {
              if (busy) return;
              setEditor(null);
              setCalendarForm(null);
              setSelectedClient(null);
              setPaymentAppointment(null);
              setConfirm(null);
              setError("");
            }}
          >
            <OwnerEditorPortal>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.4)",
                  justifyContent: "center",
                  padding: 20,
                }}
              >
                <SafeAreaView
                  edges={{ top: "off", bottom: "off", left: "off", right: "off" }}
                  style={{
                    maxHeight: "92%",
                    maxWidth: calendarForm === "block" ? 520 : 650,
                    width: "100%",
                    alignSelf: "center",
                    backgroundColor: c.card,
                    borderRadius: 20,
                  }}
                >
                  <ScrollView
                    contentContainerStyle={{
                      padding: selectedClient ? (width < 440 ? 12 : 18) : width < 440 ? 18 : 26,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        marginBottom: selectedClient ? 10 : 25,
                        minHeight: selectedClient ? 44 : 54,
                      }}
                    >
                      <View
                        style={{
                          flex: 1,
                          minWidth: 0,
                          alignItems:
                            selectedClient || editor?.table === "lj_client_records"
                              ? "center"
                              : undefined,
                          paddingHorizontal:
                            selectedClient || editor?.table === "lj_client_records" ? 54 : 0,
                        }}
                      >
                        <OT size={27} bold>
                          {confirm
                            ? "Please confirm"
                            : editor?.title ||
                              (calendarForm === "block"
                                ? editingBlock
                                  ? "Edit blocked period"
                                  : "Block time"
                                : calendarForm
                                  ? "Add Appointment"
                                  : paymentAppointment
                                    ? "Payment Complete"
                                    : selectedClient
                                      ? "Client"
                                      : "Details")}
                        </OT>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Close dialog"
                        disabled={busy}
                        onPress={() => {
                          setEditor(null);
                          setCalendarForm(null);
                          setSelectedClient(null);
                          setPaymentAppointment(null);
                          setConfirm(null);
                          setError("");
                        }}
                        style={{
                          position:
                            selectedClient || editor?.table === "lj_client_records"
                              ? "absolute"
                              : undefined,
                          right:
                            selectedClient || editor?.table === "lj_client_records" ? 0 : undefined,
                          top:
                            selectedClient || editor?.table === "lj_client_records" ? 0 : undefined,
                          minWidth: 54,
                          minHeight: 54,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="X" size={24} color={c.foreground} />
                      </Pressable>
                    </View>
                    {!!error && <ErrorBox message={error} />}
                    {editor && !confirm && (
                      <>
                        {["lj_services", "lj_products", "lj_workshops", "lj_promotions"].includes(
                          editor.table,
                        ) && (
                          <CatalogPhotoEditor
                            demo={demo}
                            disabled={busy}
                            onBusyChange={setBusy}
                            value={
                              Array.isArray(editor.values.photos)
                                ? editor.values.photos.map(String)
                                : []
                            }
                            onChange={(photos) =>
                              setEditor((current) =>
                                current
                                  ? {
                                      ...current,
                                      values: {
                                        ...current.values,
                                        photos,
                                        ...(current.table === "lj_promotions"
                                          ? {}
                                          : { image: photos[0] || current.values.image }),
                                      },
                                    }
                                  : null,
                              )
                            }
                          />
                        )}
                        {editor.fields.map((f) =>
                          f.type === "boolean" ? (
                            <Pressable
                              key={f.key}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: !!editor.values[f.key] }}
                              onPress={() =>
                                setEditor({
                                  ...editor,
                                  values: { ...editor.values, [f.key]: !editor.values[f.key] },
                                })
                              }
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 13,
                                minHeight: 56,
                                marginBottom: 15,
                              }}
                            >
                              <Icon
                                name={editor.values[f.key] ? "SquareCheck" : "Square"}
                                size={26}
                                color={c.brandAccent}
                              />
                              <ButtonLabel size={20} style={{ flex: 1, textAlign: "left" }}>
                                {fieldLabel(f.label)}
                              </ButtonLabel>
                            </Pressable>
                          ) : f.key === "category" && editor.table === "lj_services" ? (
                            <ServiceCategoryField
                              key={f.key}
                              value={String(editor.values.category || "Hair")}
                              onChange={(category) =>
                                setEditor({ ...editor, values: { ...editor.values, category } })
                              }
                            />
                          ) : f.key === "birthday" ? (
                            <DateField
                              key={f.key}
                              label={fieldLabel(f.label)}
                              value={String(editor.values[f.key] || "")}
                              birthday
                              optional
                              onChange={(value) =>
                                setEditor({
                                  ...editor,
                                  values: { ...editor.values, [f.key]: value },
                                })
                              }
                            />
                          ) : f.key === "starts_at" ? (
                            <DateTimeField
                              key={f.key}
                              label={fieldLabel(f.label)}
                              value={String(editor.values[f.key] || "")}
                              onChange={(value) =>
                                setEditor({
                                  ...editor,
                                  values: { ...editor.values, [f.key]: value },
                                })
                              }
                            />
                          ) : f.key === "duration" ? (
                            <DurationField
                              key={f.key}
                              label={fieldLabel(f.label)}
                              value={String(editor.values[f.key] || "60")}
                              onChange={(value) =>
                                setEditor({
                                  ...editor,
                                  values: { ...editor.values, [f.key]: value },
                                })
                              }
                            />
                          ) : f.key === "format" ? (
                            <View key={f.key} style={{ gap: 10, marginBottom: 20 }}>
                              <OT bold>{fieldLabel(f.label)}</OT>
                              {["In person", "Online"].map((value) => (
                                <OA
                                  key={value}
                                  label={value}
                                  secondary={editor.values[f.key] !== value}
                                  onPress={() =>
                                    setEditor({
                                      ...editor,
                                      values: { ...editor.values, [f.key]: value },
                                    })
                                  }
                                />
                              ))}
                            </View>
                          ) : (
                            <View key={f.key}>
                              {editor.table === "lj_client_records" &&
                                f.key === "private_notes" && (
                                  <View style={{ gap: 12, marginBottom: 18 }}>
                                    <OT bold>Health &amp; Safety Notes</OT>
                                    <OT muted>
                                      {String(
                                        profiles.find((p) => p.id === editor.values.customer_id)
                                          ?.health_safety_notes ||
                                          profiles.find((p) => p.id === editor.values.customer_id)
                                            ?.medical_conditions ||
                                          editor.values.medical_conditions ||
                                          "None recorded",
                                      )}
                                    </OT>
                                    <OT bold>Client Accommodations</OT>
                                    <OT muted>
                                      {String(
                                        profiles.find((p) => p.id === editor.values.customer_id)
                                          ?.client_accommodations || "None recorded",
                                      )}
                                    </OT>
                                  </View>
                                )}
                              <OF
                                label={fieldLabel(f.label)}
                                value={String(editor.values[f.key] ?? "")}
                                multiline={f.type === "multiline"}
                                onChange={(value) =>
                                  setEditor({
                                    ...editor,
                                    values: { ...editor.values, [f.key]: value },
                                  })
                                }
                              />
                            </View>
                          ),
                        )}
                        {editor.table === "lj_client_records" && (
                          <GuardianFields
                            values={editor.values}
                            onChange={(values) => setEditor({ ...editor, values })}
                          />
                        )}
                        {editor.table === "lj_services" && editor.values.id ? (
                          <View style={{ flexDirection: "row", gap: 10 }}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <OA
                                fill
                                compact
                                label={busy ? "Saving" : "Save Changes"}
                                disabled={busy}
                                onPress={() => void save()}
                              />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <OA
                                fill
                                compact
                                label="Delete Service"
                                icon="Trash2"
                                destructive
                                disabled={busy}
                                onPress={requestCatalogRemoval}
                              />
                            </View>
                          </View>
                        ) : (
                          <OA
                            label={busy ? "Saving" : "Save Changes"}
                            disabled={busy}
                            onPress={() => void save()}
                          />
                        )}
                        {!!editor.values.id &&
                          editor.table !== "lj_services" &&
                          ["lj_products", "lj_workshops"].includes(editor.table) && (
                            <View
                              style={{
                                marginTop: 28,
                                paddingTop: 24,
                                borderTopWidth: 1,
                                borderColor: c.border,
                              }}
                            >
                              <OA
                                label={
                                  "Delete " +
                                  (editor.table === "lj_services"
                                    ? "service"
                                    : editor.table === "lj_products"
                                      ? "product"
                                      : "workshop")
                                }
                                icon="Trash2"
                                destructive
                                disabled={busy}
                                onPress={requestCatalogRemoval}
                              />
                            </View>
                          )}
                      </>
                    )}
                    {calendarForm === "block" && (
                      <BlockTimeEditor
                        key={editingBlock?.id || start.slice(0, 10)}
                        date={start.slice(0, 10)}
                        block={editingBlock}
                        initialReason={initialBlockReason}
                        live={allowed && !demo}
                        onBusyChange={setBusy}
                        onDemoSave={(block) => {
                          if (
                            appointments.some(
                              (a) =>
                                a.id !== block.id &&
                                ["pending", "confirmed", "completed"].includes(a.status) &&
                                Date.parse(a.starts_at) < Date.parse(block.ends_at) &&
                                Date.parse(a.ends_at) > Date.parse(block.starts_at),
                            )
                          )
                            throw new Error("Time overlaps an appointment or block.");
                          setAppointments((old) => [
                            ...old.filter((a) => a.id !== block.id),
                            block,
                          ]);
                        }}
                        onDelete={deleteBlock}
                        onSaved={async (savedDate) => {
                          await load(true);
                          setCalendarDate(savedDate);
                          setCalendarSelected(true);
                          setCalendarView("Day");
                          setCalendarForm(null);
                          setEditingBlock(null);
                        }}
                      />
                    )}
                    {calendarForm === "appointment" && (
                      <>
                        <DateTimeField label="Date" value={start} onChange={setStart} />
                        <OT muted>Local Trinidad & Tobago time (GMT−4)</OT>
                        <View style={{ height: 20 }} />
                        {calendarForm === "appointment" && (
                          <>
                            <OT bold>Choose One Service</OT>
                            <ServiceCategories
                              booking
                              value={ownerServiceCategory}
                              onChange={setOwnerServiceCategory}
                              interactiveArrows
                            />
                            <View style={{ gap: 10, marginVertical: 18 }}>
                              {services
                                .filter(
                                  (v) =>
                                    v.active &&
                                    v.bookable !== false &&
                                    (ownerServiceCategory === "All" ||
                                      (v.is_special ? "Specials" : v.category) ===
                                        ownerServiceCategory),
                                )
                                .map((v) => (
                                  <OA
                                    key={v.id}
                                    label={`${String(v.name)} · ${servicePriceLabel(v)}`}
                                    secondary={serviceId !== v.id}
                                    onPress={() => setServiceId(v.id)}
                                  />
                                ))}
                            </View>
                            <OT bold>Saved Client</OT>
                            <View style={{ gap: 10, marginVertical: 18 }}>
                              <OA
                                label="Create New Client"
                                secondary={!customerId}
                                onPress={() => setCustomerId("")}
                              />
                              {clients.map((v) => (
                                <OA
                                  key={String(v.id)}
                                  label={String(v.full_name || v.id)}
                                  secondary={customerId !== v.id}
                                  onPress={() => setCustomerId(String(v.id))}
                                />
                              ))}
                            </View>
                            {!customerId && (
                              <View style={{ gap: 14, marginBottom: 18 }}>
                                <OF
                                  label="Full Name"
                                  value={newClientName}
                                  onChange={setNewClientName}
                                />
                                <OF
                                  label="Email"
                                  value={newClientEmail}
                                  onChange={setNewClientEmail}
                                />
                                <OF
                                  label="Mobile Number"
                                  value={newClientPhone}
                                  onChange={setNewClientPhone}
                                />
                              </View>
                            )}
                            <OT muted>
                              Manual appointments remain pending until payment arrangements are
                              confirmed by the owner.
                            </OT>
                          </>
                        )}
                        <OF label="Appointment Note (Optional)" value={note} onChange={setNote} />
                        <OA
                          label={busy ? "Saving" : "Save Appointment"}
                          disabled={busy}
                          onPress={() => void addCalendar()}
                        />
                      </>
                    )}
                    {selectedClient && (
                      <View style={{ gap: 10 }}>
                        <View style={{ alignItems: "center", gap: 5, marginBottom: 2 }}>
                          <View
                            style={{
                              padding: 2,
                              borderRadius: 52,
                              borderWidth: 1.5,
                              borderColor: c.brandAccent,
                            }}
                          >
                            <ProfilePhotoEditor
                              name={selectedClient.full_name}
                              mode="owner"
                              clientId={selectedClient.id}
                              clientPath={selectedClient.client_photo_path}
                              ownerPath={selectedClient.owner_photo_path}
                              useOwnerPhoto={selectedClient.use_owner_photo}
                              updatedAt={selectedClient.profile_photo_updated_at}
                              disabled={demo}
                              size={96}
                              onChanged={async () => {
                                const fresh = check(
                                  await db()
                                    .from("lj_client_records")
                                    .select("*")
                                    .eq("id", selectedClient.id)
                                    .single(),
                                ) as Client;
                                setSelectedClient(fresh);
                                setClients((old) =>
                                  old.map((client) => (client.id === fresh.id ? fresh : client)),
                                );
                              }}
                            />
                          </View>
                          <OT size={30} bold>
                            {selectedClient.full_name}
                          </OT>
                          <OT muted>
                            DOB{" "}
                            {selectedClient.birthday
                              ? dateLabel(selectedClient.birthday + "T12:00:00Z", {
                                  year: "numeric",
                                })
                              : "Not provided"}
                          </OT>
                          <OT muted>
                            Client Since{" "}
                            {selectedClient.created_at ||
                            profiles.find((p) => p.id === selectedClient.customer_id)?.created_at
                              ? dateLabel(
                                  String(
                                    selectedClient.created_at ||
                                      profiles.find((p) => p.id === selectedClient.customer_id)
                                        ?.created_at,
                                  ),
                                )
                              : "Not recorded"}
                          </OT>
                          {!!selectedClient.pronouns &&
                            selectedClient.pronouns !== "prefer_not" && (
                              <OT muted>
                                {selectedClient.pronouns === "she_her"
                                  ? "She/Her"
                                  : selectedClient.pronouns === "he_him"
                                    ? "He/Him"
                                    : "They/Them"}
                              </OT>
                            )}
                        </View>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <OA
                              label="Message"
                              compact
                              secondary
                              fill
                              onPress={() =>
                                setContactActions({
                                  name: selectedClient.full_name,
                                  whatsapp: selectedClient.whatsapp_phone,
                                  phone: selectedClient.phone,
                                })
                              }
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <OA
                              label="Call"
                              compact
                              secondary
                              fill
                              onPress={() =>
                                selectedClient.phone
                                  ? void Linking.openURL(
                                      `tel:${selectedClient.phone.replace(/[^\d+]/g, "")}`,
                                    ).catch(() => s.notify("Unable to start the call."))
                                  : s.notify("No phone number is saved for this client.")
                              }
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <OA
                              label={editingContact ? "Cancel" : "Edit"}
                              compact
                              secondary
                              fill
                              disabled={busy}
                              onPress={() => {
                                if (editingContact) {
                                  const saved = clients.find(
                                    (client) => client.id === selectedClient.id,
                                  );
                                  if (saved) setSelectedClient(saved);
                                }
                                setEditingContact(!editingContact);
                              }}
                            />
                          </View>
                        </View>
                        {editingContact ? (
                          <>
                            <OT size={24} bold>
                              Basic Information
                            </OT>
                            <OF
                              label="First Name"
                              wrap
                              disabled={busy}
                              value={
                                selectedClient?.first_name ??
                                String(selectedClient?.full_name ?? "").split(" ")[0]
                              }
                              onChange={(first_name) =>
                                setSelectedClient({ ...selectedClient, first_name })
                              }
                            />
                            <OF
                              label="Last Name"
                              wrap
                              disabled={busy}
                              value={
                                selectedClient.last_name ??
                                String(selectedClient?.full_name ?? "")
                                  .split(" ")
                                  .slice(1)
                                  .join(" ")
                              }
                              onChange={(last_name) =>
                                setSelectedClient({ ...selectedClient, last_name })
                              }
                            />
                          </>
                        ) : null}
                        <OT size={24} bold>
                          Contact Information
                        </OT>
                        {editingContact ? (
                          <>
                            <OF
                              label="Email"
                              wrap
                              disabled={busy}
                              keyboardType="email-address"
                              value={selectedClient.email}
                              onChange={(email) => setSelectedClient({ ...selectedClient, email })}
                            />
                            <OF
                              label="Mobile Number"
                              wrap
                              disabled={busy}
                              keyboardType="phone-pad"
                              value={selectedClient.phone}
                              onChange={(phone) => setSelectedClient({ ...selectedClient, phone })}
                            />
                          </>
                        ) : (
                          <View style={{ gap: 6 }}>
                            <View style={{ gap: 4 }}>
                              <OT bold>Phone</OT>
                              <OT>{selectedClient.phone || "Not provided"}</OT>
                            </View>
                            <View style={{ gap: 4 }}>
                              <OT bold>Email</OT>
                              <OT>{selectedClient.email || "Not provided"}</OT>
                            </View>
                            {contactIsMinor(selectedClient.birthday, selectedClient.is_minor) && (
                              <View style={{ gap: 4 }}>
                                <OT bold>Guardian</OT>
                                <OT>{selectedClient.guardian_name || "Not recorded"}</OT>
                              </View>
                            )}
                          </View>
                        )}
                        {editingContact && (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <OA
                                label="Cancel Edit"
                                secondary
                                compact
                                fill
                                disabled={busy}
                                onPress={() => {
                                  const saved = clients.find(
                                    (client) => client.id === selectedClient.id,
                                  );
                                  if (saved) setSelectedClient(saved);
                                  setEditingContact(false);
                                }}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <OA
                                label={busy ? "Saving" : "Save Client"}
                                accent
                                compact
                                fill
                                disabled={busy}
                                onPress={() => void saveSelectedContact()}
                              />
                            </View>
                          </View>
                        )}
                        {(() => {
                          const upcoming = appointments
                            .filter(
                              (a) =>
                                (a.client_id === selectedClient.id ||
                                  (!!selectedClient.customer_id &&
                                    a.customer_id === selectedClient.customer_id)) &&
                                a.kind !== "block" &&
                                ["pending", "confirmed"].includes(a.status) &&
                                new Date(a.starts_at).getTime() >= Date.now(),
                            )
                            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
                          if (!upcoming)
                            return (
                              <View style={{ gap: 8 }}>
                                <OT size={24} bold>
                                  Upcoming Appointment
                                </OT>
                                <OT muted>No upcoming appointment.</OT>
                              </View>
                            );
                          const payment = appointmentPayment(upcoming, transactions);
                          return (
                            <View style={{ gap: 10 }}>
                              <OT size={24} bold>
                                Upcoming Appointment
                              </OT>
                              <Card style={{ gap: 8, padding: 14, borderColor: c.goldBorder }}>
                                <OT bold>
                                  {dateLabel(upcoming.starts_at)} · {timeLabel(upcoming.starts_at)}
                                </OT>
                                <OT>
                                  {(Array.isArray(upcoming.services) ? upcoming.services : [])
                                    .map((item) => String(item?.name ?? "Service"))
                                    .join(", ") || "Service"}
                                </OT>
                                <OT muted>
                                  {payment.remaining <= 0
                                    ? "Paid in full"
                                    : payment.received > 0
                                      ? `Deposit received · ${money(payment.remaining)} due`
                                      : `Deposit pending · ${money(payment.remaining)} due`}
                                </OT>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                  <View style={{ flex: 1 }}>
                                    <OA
                                      label="View"
                                      secondary
                                      compact
                                      fill
                                      onPress={() => {
                                        setCalendarDate(upcoming.starts_at.slice(0, 10));
                                        setCalendarSelected(true);
                                        setSelectedClient(null);
                                        setTab("Calendar");
                                      }}
                                    />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <OA
                                      label="Payment"
                                      payment
                                      compact
                                      fill
                                      disabled={payment.remaining <= 0}
                                      onPress={() => {
                                        setSelectedClient(null);
                                        setPaymentAppointment(upcoming);
                                      }}
                                    />
                                  </View>
                                </View>
                              </Card>
                            </View>
                          );
                        })()}
                        <View style={{ gap: 8 }}>
                          <View style={{ gap: 4 }}>
                            <OT bold>Health &amp; Safety Notes</OT>
                            <OT muted>
                              {String(
                                profiles.find((p) => p.id === selectedClient.customer_id)
                                  ?.health_safety_notes ||
                                  profiles.find((p) => p.id === selectedClient.customer_id)
                                    ?.medical_conditions ||
                                  selectedClient.health_safety_notes ||
                                  selectedClient.medical_conditions ||
                                  selectedClient.sensitivities ||
                                  "None recorded",
                              )}
                            </OT>
                          </View>
                          <View style={{ gap: 4 }}>
                            <OT bold>Client Accommodations</OT>
                            <OT muted>
                              {String(
                                profiles.find((p) => p.id === selectedClient.customer_id)
                                  ?.client_accommodations ||
                                  selectedClient.client_accommodations ||
                                  "None recorded",
                              )}
                            </OT>
                          </View>
                          {editingContact ? (
                            <OF
                              label="Client Notes"
                              disabled={busy}
                              value={selectedClient.private_notes || ""}
                              multiline
                              onChange={(private_notes) =>
                                setSelectedClient({ ...selectedClient, private_notes })
                              }
                            />
                          ) : (
                            <View style={{ gap: 4 }}>
                              <OT bold>Client Notes</OT>
                              <OT>{selectedClient.private_notes || "None recorded"}</OT>
                            </View>
                          )}
                        </View>
                        <OwnerClientLoyalty clientId={selectedClient.id} demo={demo} />
                        <View
                          style={{
                            minHeight: 44,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <OT size={24} bold>
                            Media
                          </OT>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() =>
                              setMediaContext({ mode: "gallery", clientId: selectedClient.id })
                            }
                            style={{
                              minHeight: 44,
                              paddingHorizontal: 4,
                              justifyContent: "center",
                            }}
                          >
                            <OT size={16} bold>
                              All Media
                            </OT>
                          </Pressable>
                        </View>
                        <OwnerClientMediaPreview clientId={selectedClient.id} demo={demo} />
                        <View style={{ alignItems: "center" }}>
                          <OA
                            label="Add Media"
                            accent
                            compact
                            onPress={() =>
                              setMediaContext({ mode: "upload", clientId: selectedClient.id })
                            }
                          />
                        </View>
                        <ConsultationRequestsPanel
                          services={services}
                          appointments={appointments}
                          demo={demo}
                          clientId={selectedClient.id}
                          onChanged={() => load(true)}
                        />
                        <ClientPurchaseHistory
                          clientId={selectedClient.id}
                          customerId={selectedClient.customer_id || selectedClient.id}
                          appointments={appointments}
                          transactions={transactions}
                        />
                        <OT size={24} bold>
                          Service Agreement
                        </OT>
                        <AgreementList
                          demo={demo}
                          customerId={selectedClient.customer_id || selectedClient.id}
                        />
                        <View
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTopWidth: 1,
                            borderColor: c.border,
                          }}
                        >
                          <View style={{ width: "100%", alignItems: "center" }}>
                            <OA
                              label="Delete Client"
                              icon="Trash2"
                              secondary
                              centered
                              onPress={() => {
                                const contact = selectedClient;
                                setSelectedClient(null);
                                setError("");
                                setConfirm({
                                  text: "Delete " + contact.full_name + "?",
                                  detail:
                                    "This removes the client from your directory. Their account, appointments and payment history are kept.",
                                  actionLabel: "Delete Client",
                                  run: async () => {
                                    if (demo) {
                                      setClients((old) =>
                                        old.filter((item) => item.id !== contact.id),
                                      );
                                      s.notify("Client deleted.");
                                    } else {
                                      check(
                                        await db().rpc("lj_delete_contact", { p_id: contact.id }),
                                      );
                                      await load(true);
                                      s.notify("Client removed from the salon directory.");
                                    }
                                  },
                                });
                              }}
                            />
                          </View>
                        </View>
                      </View>
                    )}
                    {paymentAppointment && (
                      <PaymentCompletion
                        appointment={
                          appointments.find((a) => a.id === paymentAppointment.id) ??
                          paymentAppointment
                        }
                        transactions={transactions}
                        demo={demo}
                        onConfirm={(method, reference, amount) =>
                          recordPayment(paymentAppointment, method, reference, amount)
                        }
                        onGiftApplied={() => load()}
                      />
                    )}
                    {confirm && (
                      <View style={{ gap: 22 }}>
                        <OT>{confirm.text}</OT>
                        {!!confirm.detail && <OT muted>{confirm.detail}</OT>}
                        {confirm.actionLabel === "Delete Client" ? (
                          <ContactRemovalConfirmation
                            busy={busy}
                            onCancel={() => setConfirm(null)}
                            onConfirm={() => void runConfirmedAction()}
                          />
                        ) : (
                          <>
                            <OA
                              label={busy ? "Confirming" : confirm.actionLabel || "Confirm"}
                              destructive={confirm.actionLabel?.startsWith("Delete")}
                              disabled={busy}
                              onPress={() => void runConfirmedAction()}
                            />
                            <OA
                              label={confirm.cancelLabel || "Go back"}
                              secondary
                              disabled={busy}
                              onPress={() => setConfirm(null)}
                            />
                          </>
                        )}
                      </View>
                    )}
                  </ScrollView>
                </SafeAreaView>
              </View>
            </OwnerEditorPortal>
          </Modal>
        )}
      {contactActions && (
        <MessageClientMenu
          {...contactActions}
          demo={demo}
          onClose={() => setContactActions(null)}
        />
      )}
      {feedback && <OwnerFeedback value={feedback} onDismiss={() => setFeedback(null)} />}
      {celebration && (
        <CompletionCelebration
          key={celebration.id}
          onStart={() => {
            setBusy(true);
            void complete(celebration, "completed")
              .catch((e) => {
                setCelebration(null);
                setError(e instanceof Error ? e.message : "Unable to complete service.");
              })
              .finally(() => setBusy(false));
          }}
          onDone={() => setCelebration(null)}
        />
      )}
      {!!paymentCelebration && (
        <MoneyCelebration key={paymentCelebration} onDone={() => setPaymentCelebration(0)} />
      )}
    </OwnerWorkspace>
  );
}
