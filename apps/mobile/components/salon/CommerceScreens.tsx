import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Icon from "@/lib/icons/LucideIcon";
import { useSalon } from "@/lib/salon/SalonProvider";
import PromoCode from "./PromoCode";
import { useDiscountQuote } from "@/lib/salon/discounts";
import { db, check } from "@/lib/salon/client";
import { money } from "@/lib/salon/types";
import Shell, { useNav } from "./Shell";
import { PaymentChoice } from "./BookingScreen";
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
    total = items.reduce((n, v) => n + Number(v.price) * s.cart[v.id], 0);
  const update = (id: string, qty: number) =>
    s.setCart((old) => {
      const copy = { ...old };
      if (qty <= 0) delete copy[id];
      else copy[id] = qty;
      return copy;
    });
  return (
    <Shell>
      <Heading sub="A little Lady J, for your everyday.">Your shopping bag</Heading>
      {!items.length ? (
        <Empty
          title="Make your routine a little more beautiful"
          body="Explore our thoughtful collection of hair, skin and body essentials."
          action={<Action label="Explore the boutique" onPress={() => go("boutique")} />}
        />
      ) : (
        <View style={{ maxWidth: 850, gap: 16 }}>
          <Tag>Sample data</Tag>
          {items.map((v) => (
            <Card key={v.id} style={{ flexDirection: "row", gap: 18, padding: 17 }}>
              <Photo name={v.image} style={{ width: 85, height: 105, borderRadius: 10 }} />
              <View style={{ flex: 1, gap: 5 }}>
                <Txt bold size={17}>
                  {v.name}
                </Txt>
                <Txt>{money(v.price)}</Txt>
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
            </Card>
          ))}
          <Card style={{ gap: 15 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt size={20}>Subtotal</Txt>
              <Txt size={23} bold>
                {money(total)}
              </Txt>
            </View>
            <Txt size={12} color={c.mutedForeground}>
              Pickup is complimentary. Any delivery fee is shown before you submit your order.
            </Txt>
            <Action
              label="Continue to checkout"
              icon="ArrowRight"
              onPress={() => go("checkout", { kind: "product" })}
              style={{ alignSelf: "stretch" }}
            />
          </Card>
        </View>
      )}
    </Shell>
  );
}
export function CheckoutScreen({ kind, id }: { kind: string; id?: string }) {
  const s = useSalon(),
    go = useNav(),
    c = useColors(),
    { width } = useWindowDimensions();
  const [method, setMethod] = useState("bank"),
    [fulfillment, setFulfillment] = useState("pickup"),
    [address, setAddress] = useState(""),
    [reference, setReference] = useState(""),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState("");
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
    if (!accepted || (s.session && !pricing.ready)) return;
    if (!isWorkshop && fulfillment === "delivery" && address.trim().length < 10) {
      setError("Please enter your complete delivery address.");
      return;
    }
    if (method === "simulation") {
      setDone("demo");
      return;
    }
    if (!s.session) {
      go("login", { next: "bag" });
      return;
    }
    setBusy(true);
    try {
      const result = check(
        await db().rpc("lj_checkout", {
          p_kind: isWorkshop ? "workshop" : "product",
          p_items: items.map(({ id, quantity }) => ({ id, quantity })),
          p_fulfillment: isWorkshop ? "online" : fulfillment,
          p_address: address,
          p_reference: reference,
          p_code: pricing.code,
        }),
      );
      setDone(String(result));
      if (!isWorkshop) s.setCart({});
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
          <Icon
            name={done === "demo" ? "Sparkles" : "CircleCheck"}
            size={40}
            color={c.brandAccent}
          />
          <Tag>{done === "demo" ? "No purchase created" : "Request saved · Payment pending"}</Tag>
          <Txt serif size={31}>
            {done === "demo"
              ? "Your checkout preview is complete."
              : "Your request is with Lady J."}
          </Txt>
          <Txt style={{ textAlign: "center" }}>
            {done === "demo"
              ? "No payment was taken, no stock was reserved and no purchase or registration was created."
              : "Your bank transfer must be verified by the owner before your purchase is confirmed or workshop access opens."}
          </Txt>
          {done === "demo" ? (
            <Action
              label="Choose bank transfer"
              onPress={() => {
                setDone("");
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
            {!s.session && (
              <Card style={{ gap: 14 }}>
                <Txt>
                  Sign in to submit a bank transfer request and track it in your private account.
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
            {s.session && <PromoCode pricing={pricing} />}
            <PaymentChoice method={method} setMethod={setMethod} />
            {method === "bank" && (
              <Field
                label="Transfer reference (if available)"
                value={reference}
                onChangeText={setReference}
              />
            )}
            <Check
              checked={accepted}
              onPress={() => setAccepted(!accepted)}
              label="I accept the purchase terms."
            />
            <LinkText onPress={() => go("terms")}>Read purchase terms</LinkText>
            <Action
              busy={busy}
              disabled={
                !accepted || (method === "bank" && !s.session) || (!!s.session && !pricing.ready)
              }
              label={
                method === "simulation"
                  ? "Try simulated card checkout"
                  : "Submit bank transfer request"
              }
              onPress={() => void submit()}
              style={{ alignSelf: "stretch" }}
            />
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
                <Txt>{money(v.price * v.quantity)}</Txt>
              </View>
            ))}
            {Number(pricing.quote?.discount_total) > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt color={c.success}>Discount</Txt>
                <Txt color={c.success}>−{money(pricing.quote!.discount_total)}</Txt>
              </View>
            )}
            {!isWorkshop && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt size={14}>{fulfillment === "pickup" ? "Salon pickup" : "Delivery fee"}</Txt>
                <Txt>{delivery ? money(delivery) : "Complimentary"}</Txt>
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
                {money(total)}
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
