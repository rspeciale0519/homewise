import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import {
  mailClassLabel,
  productTypeLabel,
  workflowLabel,
  type MailClass,
  type ProductType,
  type Workflow,
} from "./constants";
import type { ReturnAddress } from "./schemas";

Font.register({
  family: "Cormorant Garamond",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/cormorantgaramond/v22/co3YmX5slCNuHLi8bLeY9MK7whWMhyjornFLsS6V7wx43g.woff2",
      fontWeight: "normal",
    },
    {
      src: "https://fonts.gstatic.com/s/cormorantgaramond/v22/co3bmX5slCNuHLi8bLeY9MK7whWMhyjornFLsS6V7wx43g.woff2",
      fontWeight: "bold",
    },
  ],
});

Font.register({
  family: "DM Sans",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIHQ.woff2",
      fontWeight: "normal",
    },
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2Cp2ywxg089UriASitCBimQ.woff2",
      fontWeight: "bold",
    },
  ],
});

const NAVY = "#2E276D";
const CRIMSON = "#DB2526";
const AMBER = "#92400E";
const SLATE_100 = "#F1F5F9";
const SLATE_400 = "#94A3B8";
const SLATE_600 = "#475569";
const SLATE_700 = "#334155";

const s = StyleSheet.create({
  page: { fontFamily: "DM Sans", backgroundColor: "#FFFFFF", padding: 32 },
  header: { borderBottom: `2 solid ${NAVY}`, paddingBottom: 12, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  headerLeft: { flexDirection: "column", gap: 2 },
  brand: { fontFamily: "Cormorant Garamond", fontSize: 16, fontWeight: "bold", color: NAVY, letterSpacing: 2 },
  brandSub: { fontSize: 8, color: SLATE_400, letterSpacing: 1.5, textTransform: "uppercase" },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 2 },
  ylsTag: { fontSize: 8, color: AMBER, letterSpacing: 1, textTransform: "uppercase" },
  stamp: { fontSize: 9, color: SLATE_600 },

  title: { fontFamily: "Cormorant Garamond", fontSize: 22, fontWeight: "bold", color: NAVY, marginBottom: 4 },
  subtitle: { fontSize: 10, color: SLATE_600, marginBottom: 18 },

  sectionLabel: { fontSize: 8, fontWeight: "bold", color: CRIMSON, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, marginTop: 14 },
  block: { backgroundColor: SLATE_100, padding: 12, borderRadius: 4, gap: 6 },
  row: { flexDirection: "row", gap: 8 },
  label: { fontSize: 9, color: SLATE_400, width: 120 },
  value: { fontSize: 10, color: NAVY, flex: 1 },
  valueStrong: { fontSize: 10, fontWeight: "bold", color: NAVY, flex: 1 },

  notes: { fontSize: 10, color: SLATE_700, lineHeight: 1.5, padding: 8, backgroundColor: SLATE_100, borderRadius: 4 },

  footer: { position: "absolute", bottom: 24, left: 32, right: 32, borderTop: `1 solid ${SLATE_100}`, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: SLATE_400 },
});

export interface OrderSummaryPdfProps {
  orderRef: string;
  submittedAt: Date;
  agent: {
    name: string;
    email: string;
    phone: string | null;
    brokerage: string;
  };
  workflow: Workflow;
  subjectPropertyAddress: string | null;
  campaignName: string | null;
  productType: ProductType;
  productSize: string;
  mailClass: MailClass;
  dropDate: string;
  quantity: number;
  listRowCount: number;
  returnAddress: ReturnAddress;
  specialInstructions: string | null;
  fileRefs: {
    front: string;
    back: string | null;
    list: string;
  };
}

export function OrderSummaryPdf(props: OrderSummaryPdfProps) {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.brand}>HOMEWISE FL</Text>
            <Text style={s.brandSub}>Direct Mail Order</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.ylsTag}>For: YellowLetterShop.com</Text>
            <Text style={s.stamp}>Submitted: {formatStamp(props.submittedAt)}</Text>
            <Text style={s.stamp}>Ref: {props.orderRef}</Text>
          </View>
        </View>

        <Text style={s.title}>{workflowLabel(props.workflow)}</Text>
        <Text style={s.subtitle}>
          {props.subjectPropertyAddress
            ? `Subject property: ${props.subjectPropertyAddress}`
            : props.campaignName
              ? `Campaign: ${props.campaignName}`
              : "Custom direct mail order"}
        </Text>

        <Text style={s.sectionLabel}>Agent</Text>
        <View style={s.block}>
          <Row label="Name" value={props.agent.name} strong />
          <Row label="Brokerage" value={props.agent.brokerage} />
          <Row label="Email" value={props.agent.email} />
          {props.agent.phone && <Row label="Phone" value={props.agent.phone} />}
        </View>

        <Text style={s.sectionLabel}>Mail spec</Text>
        <View style={s.block}>
          <Row label="Product" value={`${productTypeLabel(props.productType)} · ${props.productSize}`} strong />
          <Row label="Mail class" value={mailClassLabel(props.mailClass)} />
          <Row label="Drop date" value={props.dropDate} />
          <Row label="Quantity" value={`${props.quantity.toLocaleString()} pieces`} />
          <Row label="List size" value={`${props.listRowCount.toLocaleString()} recipients`} />
        </View>

        <Text style={s.sectionLabel}>Return address</Text>
        <View style={s.block}>
          <Row label="Name" value={props.returnAddress.name} />
          <Row label="Street" value={props.returnAddress.address1} />
          {props.returnAddress.address2 && <Row label="Suite/Unit" value={props.returnAddress.address2} />}
          <Row label="City/State/ZIP" value={`${props.returnAddress.city}, ${props.returnAddress.state} ${props.returnAddress.zip}`} />
        </View>

        <Text style={s.sectionLabel}>Files</Text>
        <View style={s.block}>
          <Row label="Front artwork" value={props.fileRefs.front} />
          <Row label="Back artwork" value={props.fileRefs.back ?? "None (single-sided)"} />
          <Row label="Mailing list" value={props.fileRefs.list} />
        </View>

        {props.specialInstructions && (
          <>
            <Text style={s.sectionLabel}>Special instructions</Text>
            <Text style={s.notes}>{props.specialInstructions}</Text>
          </>
        )}

        <View style={s.footer}>
          <Text style={s.footerText}>Generated by HomeWise FL on behalf of the agent above.</Text>
          <Text style={s.footerText}>Reply to the email this PDF was attached to with proofs and invoice.</Text>
        </View>
      </Page>
    </Document>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={strong ? s.valueStrong : s.value}>{value}</Text>
    </View>
  );
}

function formatStamp(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}
