import React, { useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import BagPaymentButton, { BagCardNotice, BAG_CARD_UNAVAILABLE_MESSAGE } from "./BagPaymentButton";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import PromoCode from "./PromoCode";
import { useDiscountQuote } from "@/lib/salon/discounts";
import { db, check } from "@/lib/salon/client";
import { money } from "@/lib/salon/types";
import Shell, { useNav } from "./Shell";
import { PaymentChoice, requestUuid } from "./BookingScreen";
import FavoriteButton from "./FavoriteButton";
import {
  Txt,
  Action,
  Heading,
  Photo,
  Tag,
  Card,
  Empty,
  Field,
  Check,
  ErrorBox,
  LinkText,
  Chip,
  IconButton,
  useColors,
  shared,
} from "./ui";
export function BagScreen() {
  const s = useSalon(),
    go = useNav(),
    c = useColors();
  const items = s.products.filter((v) => s.cart[v.id] > 0),
    services = s.services.filter((v) => s.selected.includes(v.id)),
    workshops = s.workshops.filter((v) => s.workshopCart.includes(v.id)),
    total =
      items.reduce((n, v) => n + Number(v.price) * s.cart[v.id], 0) +
      services.reduce((n, v) => n + Number(v.price), 0) +
      workshops.reduce((n, v) => n + Number(v.price), 0),
    hasItems = items.length > 0 || services.length > 0 || workshops.length > 0;
  const update = (id: string, qty: number) =>
    s.setCart((old) => {
      const copy = { ...old };
      if (qty <= 0) delete copy[id];
      else copy[id] = qty;
      return copy;
    });
  return (
    <Shell>
      <Heading compact singleLine sub="A little Lady J, for your everyday.">
        Your Shopping Bag
      </Heading>
      {!hasItems ? (
        <Empty
          title="Make your routine a little more beautiful"
          body="Explore our thoughtful collection of hair, skin and body essentials."
          action={<Action label="Explore the boutique" onPress={() => go("boutique")} />}
        />
      ) : (
        <View style={{ maxWidth: 850, gap: 16 }}>
          <Tag>Sample data</Tag>
          {!!services.length && (
            <Card style={{ gap: 14 }}>
              <Txt serif size={25}>
                Appointments
              </Txt>
              {services.map((service) => (
                <View
                  key={service.id}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt bold numberOfLines={1} ellipsizeMode="tail">
                      {service.name}
                    </Txt>
                    <Txt size={13} color={c.mutedForeground}>
                      {money(service.price)}
                    </Txt>
                  </View>
                  <LinkText
                    onPress={() => s.setSelected((old) => old.filter((id) => id !== service.id))}
                  >
                    Remove
                  </LinkText>
                </View>
              ))}
              <Action
                label="Choose Appointment Time"
                icon="CalendarDays"
                onPress={() => go("booking")}
                style={{ alignSelf: "stretch" }}
              />
            </Card>
          )}
          {!!workshops.length && (
            <Card style={{ gap: 14 }}>
              <Txt serif size={25}>
                Workshops
              </Txt>
              {workshops.map((workshop) => (
                <View
                  key={workshop.id}
                  style={{ gap: 8, borderTopWidth: 1, borderColor: c.border, paddingTop: 12 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt bold>{workshop.name}</Txt>
                      <Txt size={13} color={c.mutedForeground}>
                        {money(workshop.price)}
                      </Txt>
                    </View>
                    <LinkText
                      onPress={() =>
                        s.setWorkshopCart((old) => old.filter((id) => id !== workshop.id))
                      }
                    >
                      Remove
                    </LinkText>
                  </View>
                  <BagPaymentButton
                    onPress={() => go("checkout", { kind: "workshop", id: workshop.id, source: "bag" })}
                  />
                  <BagCardNotice />
                </View>
              ))}
            </Card>
          )}
          {!!items.length && (
            <Txt serif size={25}>
              Products
            </Txt>
          )}
          {items.map((v) => (
            <Card
              key={v.id}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 8 }}
            >
              <Photo name={v.image} style={{ width: 85, height: 105, borderRadius: 10 }} />
              <View style={{ flex: 1, minWidth: 0, gap: 3, paddingRight: 38 }}>
                <Txt bold size={17} numberOfLines={1} ellipsizeMode="tail">
                  {v.name}
                </Txt>
                <Txt>TTD {money(v.price)}</Txt>
                <View style={shared.row}>
                  <IconButton
                    name="Minus"
                    onPress={() => update(v.id, s.cart[v.id] - 1)}
                    label={`Remove one ${v.name}`}
                  />
                  <Txt>{s.cart[v.id]}</Txt>
                  <IconButton
                    name="Plus"
                    onPress={() => {
                      if (s.cart[v.id] < v.stock) update(v.id, s.cart[v.id] + 1);
                      else s.notify("That’s all the stock currently available.");
                    }}
                    label={`Add one ${v.name}`}
                  />
                  <LinkText onPress={() => update(v.id, 0)}>Remove</LinkText>
                </View>
              </View>
              <View style={{ position: "absolute", right: 4, bottom: 4 }}>
                <FavoriteButton compact kind="product" itemId={v.id} />
              </View>
            </Card>
          ))}
          <Card style={{ gap: 15 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt size={20}>Bag total</Txt>
              <Txt size={23} bold>
                TTD {money(total)}
              </Txt>
            </View>
            <Txt size={12} color={c.mutedForeground}>
              Pickup is complimentary. Any delivery fee is shown before you submit your order.
            </Txt>
            {!!items.length && (
              <>
                <BagPaymentButton arrow onPress={() => go("checkout", { kind: "product", source: "bag" })} />
                <BagCardNotice />
              </>
            )}
          </Card>
        </View>
      )}
    </Shell>
  );
}
export function CheckoutScreen({ kind, id }: { kind: string; id?: string }) {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const bagCheckout = kind !== "workshop" || source === "bag";
  const s = useSalon(),
    go = useNav(),
    c = useColors(),
    { width } = useWindowDimensions();
  const [method, setMethod] = useState(s.testMode ? "card" : "bank"),
    [demoCardReady, setDemoCardReady] = useState(false),
    [fulfillment, setFulfillment] = useState("pickup"),
    [address, setAddress] = useState(""),
    [reference, setReference] = useState(""),
    [contactName, setContactName] = useState(s.profile?.full_name || ""),
    [contactEmail, setContactEmail] = useState(s.profile?.email || s.session?.user.email || ""),
    [contactPhone, setContactPhone] = useState(s.profile?.phone || ""),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState<null | {
      orderNumber: string;
      paymentStatus: string;
      demo: boolean;
      method: string;
      total: number;
      items: typeof items;
    }>(null);
  const checkoutRequestKey = useRef(requestUuid());
  const workshop = s.workshops.find((v) => v.id === id),
    isWorkshop = kind === "workshop";
  const items = isWorkshop
    ? workshop
      ? [{ id: workshop.id, name: workshop.name, price: Number(workshop.price), quantity: 1 }]
      : []
    : s.products
        .filter((v) => s.cart[v.id] > 0)
        .map((v) => ({ id: v.id, name: v.name, price: Number(v.price), quantity: s.cart[v.id] }));
  const pricing = useDiscountQuote(
    isWorkshop ? "workshop" : "product",
    items.map(({ id, quantity }) => ({ id, quantity })),
  );
  const subtotal = Number(
      pricing.quote?.subtotal ?? items.reduce((n, v) => n + v.price * v.quantity, 0),
    ),
    delivery =
      !isWorkshop && fulfillment === "delivery" ? Number(s.settings?.delivery_fee || 0) : 0,
    total = subtotal + delivery;
  async function submit() {
    setError("");
    // No processor is configured. Never fall through to bank orders or demo success.
    if (bagCheckout) {
      setError(BAG_CARD_UNAVAILABLE_MESSAGE);
      return;
    }
    if (!accepted || (s.session && !pricing.ready)) return;
    if (!isWorkshop && fulfillment === "delivery" && address.trim().length < 10) {
      setError("Please enter your complete delivery address.");
      return;
    }
    if (!contactName.trim() || !contactEmail.includes("@") || contactPhone.trim().length < 7) {
      setError("Confirm your name, email address and phone number.");
      return;
    }
    if (method === "card" && !demoCardReady) {
      setError("Enter the successful demo card details before continuing.");
      return;
    }
    if (s.testMode) {
      setDone({
        orderNumber: "DEMO-CHECKOUT",
        paymentStatus: "Test payment only · No order created",
        demo: true,
        method: method === "card" ? "Demo Credit Card" : "Bank Wire Transfer (Demo)",
        total,
        items,
      });
      return;
    }
    if (!s.session && !s.testMode) {
      go("login", { next: "bag" });
      return;
    }
    setBusy(true);
    try {
      const result = check(
        await db().rpc("lj_checkout_v2", {
          p_kind: isWorkshop ? "workshop" : "product",
          p_items: items.map(({ id, quantity }) => ({ id, quantity })),
          p_fulfillment: isWorkshop ? "online" : fulfillment,
          p_address: address,
          p_reference: reference,
          p_code: pricing.code,
          p_request_key: checkoutRequestKey.current,
          p_contact_name: contactName.trim(),
          p_contact_email: contactEmail.trim(),
          p_contact_phone: contactPhone.trim(),
        }),
      ) as { id: string; order_number: string; payment_status: string };
      setDone({
        orderNumber: result.order_number,
        paymentStatus: result.payment_status,
        demo: false,
        method: "Bank Wire Transfer",
        total,
        items,
      });
      if (isWorkshop && workshop) {
        s.setWorkshopCart((old) => old.filter((workshopId) => workshopId !== workshop.id));
      } else {
        s.setCart({});
      }
      await Promise.all([s.refreshPrivate(), s.refresh()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t save your request.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <Heading
        sub={
          isWorkshop ? "Make space for something new." : "A little luxury, thoughtfully delivered."
        }
      >
        {isWorkshop ? "Workshop registration" : "Secure checkout"}
      </Heading>
      {done ? (
        <Card style={{ maxWidth: 650, gap: 20, alignSelf: "center", alignItems: "center" }}>
          <Icon name={done.demo ? "Sparkles" : "CircleCheck"} size={40} color={c.brandAccent} />
          <Tag>
            {done.demo
              ? "Demo only · No purchase created"
              : "Order submitted · Awaiting payment verification"}
          </Tag>
          <Txt serif size={31}>
            {done.demo ? "Your checkout preview is complete." : "Your order is with Lady J."}
          </Txt>
          <Txt bold size={18}>
            Order {done.orderNumber}
          </Txt>
          <View style={{ width: "100%", gap: 7 }}>
            {done.items.map((item) => (
              <View
                key={item.id}
                style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
              >
                <Txt style={{ flex: 1 }}>
                  {item.name} × {item.quantity}
                </Txt>
                <Txt>TTD {money(item.price * item.quantity)}</Txt>
              </View>
            ))}
            <Txt bold>Total: TTD {money(done.total)}</Txt>
            <Txt>Payment: {done.method}</Txt>
            <Txt>Status: {done.paymentStatus.replaceAll("_", " ")}</Txt>
          </View>
          <Txt style={{ textAlign: "center" }}>
            {done.demo
              ? "No payment was taken, no stock was reserved and no purchase or registration was created."
              : "Submitting an order is not proof of payment. Lady J must verify the bank transfer before the order is marked paid or prepared."}
          </Txt>
          {done.demo ? (
            <Action
              label="Choose bank transfer"
              onPress={() => {
                setDone(null);
                setMethod("bank");
              }}
            />
          ) : (
            <Action
              label={isWorkshop ? "My workshops" : "My orders"}
              onPress={() => go(isWorkshop ? "my-workshops" : "orders")}
            />
          )}
        </Card>
      ) : !items.length ? (
        <Empty
          title="Nothing to check out yet"
          body="Choose a workshop or add a little something to your shopping bag."
          action={<Action label="Explore the boutique" onPress={() => go("boutique")} />}
        />
      ) : (
        <View style={{ flexDirection: width > 800 ? "row" : "column", gap: 28 }}>
          <View style={{ flex: 1, gap: 20 }}>
            {!!error && <ErrorBox message={error} />}
            <Tag>Sample data</Tag>
            {!s.session && !s.testMode && (
              <Card style={{ gap: 14 }}>
                <Txt>
                  {bagCheckout
                    ? "Sign in to review your bag and track purchases in your private account."
                    : "Sign in to submit a bank transfer request and track it in your private account."}
                </Txt>
                <Action
                  label="Sign in"
                  onPress={() => go("login", { next: isWorkshop ? "workshops" : "bag" })}
                />
              </Card>
            )}
            {!isWorkshop && (
              <Card>
                <Txt bold size={17} style={{ marginBottom: 17 }}>
                  How would you like your order?
                </Txt>
                <View style={shared.row}>
                  {["pickup", "delivery"].map((v) => (
                    <Chip
                      key={v}
                      label={v === "pickup" ? "Salon pickup" : "Delivery"}
                      selected={fulfillment === v}
                      onPress={() => setFulfillment(v)}
                    />
                  ))}
                </View>
                {fulfillment === "delivery" && (
                  <View style={{ marginTop: 20 }}>
                    <Field
                      label="Complete delivery address"
                      multiline
                      value={address}
                      onChangeText={setAddress}
                    />
                    <Txt size={12} color={c.mutedForeground}>
                      Delivery area and timing require confirmation by the salon.
                    </Txt>
                  </View>
                )}
              </Card>
            )}
            <Card style={{ gap: 12 }}>
              <Txt bold size={17}>
                Confirm your contact information
              </Txt>
              <Field label="Full Name" value={contactName} onChangeText={setContactName} />
              <Field
                label="Email Address"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
              />
              <Field
                label="Phone Number"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
              />
            </Card>
            {s.session && <PromoCode pricing={pricing} />}
            {bagCheckout ? (
              <Card style={{ gap: 12 }}>
                <Txt bold size={17}>Credit Card · Debit Card</Txt>
                <Txt color={c.mutedForeground}>{BAG_CARD_UNAVAILABLE_MESSAGE}</Txt>
              </Card>
            ) : (
            <PaymentChoice
              method={method}
              setMethod={setMethod}
              deposit={total}
              fullTotal={total}
              allowDeposit={false}
              reference={reference}
              setReference={setReference}
              collectReceipt={false}
              onDemoCardReady={setDemoCardReady}
            />
            )}
            <Check
              checked={accepted}
              onPress={() => setAccepted(!accepted)}
              label="I accept the purchase terms."
            />
            <LinkText onPress={() => go("terms")}>Read purchase terms</LinkText>
            {bagCheckout ? (
              <>
                <BagPaymentButton disabled onPress={() => void submit()} />
                <BagCardNotice />
              </>
            ) : (
            <Action
              busy={busy}
              disabled={
                !accepted ||
                (method === "bank" && !s.session && !s.testMode) ||
                (method === "card" && !demoCardReady) ||
                ((!!s.session || s.testMode) && !pricing.ready)
              }
              label={
                method === "card"
                  ? `Pay TTD ${money(total)} with Demo Card`
                  : "Submit Bank Transfer Order"
              }
              onPress={() => void submit()}
              style={{ alignSelf: "stretch" }}
            />
            )}
          </View>
          <Card
            style={{
              flex: width > 800 ? 0.7 : undefined,
              alignSelf: "flex-start",
              width: width > 800 ? undefined : "100%",
              gap: 18,
            }}
          >
            <Txt serif size={27}>
              Your {isWorkshop ? "workshop" : "order"}
            </Txt>
            {items.map((v) => (
              <View
                key={v.id}
                style={{ flexDirection: "row", justifyContent: "space-between", gap: 20 }}
              >
                <Txt size={15} style={{ flex: 1 }}>
                  {v.name} × {v.quantity}
                </Txt>
                <Txt>TTD {money(v.price * v.quantity)}</Txt>
              </View>
            ))}
            {Number(pricing.quote?.discount_total) > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt color={c.success}>Discount</Txt>
                <Txt color={c.success}>−TTD {money(pricing.quote!.discount_total)}</Txt>
              </View>
            )}
            {!isWorkshop && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt size={14}>{fulfillment === "pickup" ? "Salon pickup" : "Delivery fee"}</Txt>
                <Txt>{delivery ? `TTD ${money(delivery)}` : "Complimentary"}</Txt>
              </View>
            )}
            <View
              style={{
                borderTopWidth: 1,
                borderColor: c.border,
                paddingTop: 20,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Txt size={19} bold>
                Total
              </Txt>
              <Txt size={24} bold>
                TTD {money(total)}
              </Txt>
            </View>
            <Txt size={12} color={c.mutedForeground}>
              All prices are in Trinidad & Tobago dollars. We never collect or store card numbers or
              CVV.
            </Txt>
          </Card>
        </View>
      )}
    </Shell>
  );
}
