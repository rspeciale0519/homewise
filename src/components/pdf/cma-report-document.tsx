import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

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

export interface CmaComp {
  address: string;
  city: string;
  soldPrice: number;
  beds: number;
  baths: number;
  sqft: number;
  dom: number;
  closeDate: string | null;
}

export interface CmaSubjectProperty {
  address: string;
  city: string;
  zip: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
}

export interface CmaReportProps {
  estimatedValue?: { low: number; mid: number; high: number };
  pricingRecommendation?: string;
  marketNarrative?: string;
  keyFindings?: string[];
  comps: CmaComp[];
  subjectProperty: CmaSubjectProperty;
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string;
}

const NAVY = "#2E276D";
const CRIMSON = "#DB2526";
const WHITE = "#FFFFFF";
const SLATE_100 = "#F1F5F9";
const SLATE_600 = "#475569";
const SLATE_400 = "#94A3B8";

const s = StyleSheet.create({
  page: { fontFamily: "DM Sans", backgroundColor: WHITE, paddingBottom: 40 },
  // Header
  header: { backgroundColor: NAVY, flexDirection: "row", justifyContent: "space-between", padding: 24 },
  headerLeft: { flexDirection: "column", gap: 2 },
  headerBrand: { fontFamily: "Cormorant Garamond", fontSize: 18, fontWeight: "bold", color: WHITE, letterSpacing: 2 },
  headerSubtitle: { fontSize: 9, color: "rgba(255,255,255,0.75)", letterSpacing: 1 },
  headerRight: { flexDirection: "column", alignItems: "flex-end", gap: 2 },
  headerAgentName: { fontSize: 10, fontWeight: "bold", color: WHITE },
  headerAgentDetail: { fontSize: 8, color: "rgba(255,255,255,0.7)" },
  // Subject property
  subjectBlock: { padding: "16 24 12 24", borderBottom: `1 solid ${SLATE_100}` },
  sectionLabel: { fontSize: 7, fontWeight: "bold", color: SLATE_400, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  subjectAddress: { fontFamily: "Cormorant Garamond", fontSize: 20, fontWeight: "bold", color: NAVY, marginBottom: 6 },
  subjectStats: { flexDirection: "row", gap: 16 },
  subjectStat: { flexDirection: "column" },
  subjectStatVal: { fontSize: 12, fontWeight: "bold", color: NAVY },
  subjectStatLbl: { fontSize: 7, color: SLATE_400 },
  // Comps table
  tableSection: { padding: "12 24" },
  tableHeader: { flexDirection: "row", backgroundColor: NAVY, borderRadius: 2, padding: "4 6", marginBottom: 2 },
  tableRow: { flexDirection: "row", padding: "4 6", borderBottom: `0.5 solid ${SLATE_100}` },
  tableRowAlt: { flexDirection: "row", padding: "4 6", borderBottom: `0.5 solid ${SLATE_100}`, backgroundColor: SLATE_100 },
  thCell: { fontSize: 7, fontWeight: "bold", color: WHITE },
  tdCell: { fontSize: 7.5, color: SLATE_600 },
  colAddress: { width: "28%" },
  colBeds: { width: "8%" },
  colBaths: { width: "8%" },
  colSqft: { width: "12%" },
  colPrice: { width: "16%" },
  colDate: { width: "16%" },
  colDom: { width: "12%" },
  // Price band
  priceBand: { backgroundColor: CRIMSON, flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: "14 24", marginTop: 8 },
  priceBandLabel: { fontSize: 10, color: WHITE, letterSpacing: 0.5 },
  priceBandPrice: { fontFamily: "Cormorant Garamond", fontSize: 24, fontWeight: "bold", color: WHITE },
  // Value range
  valueRange: { flexDirection: "row", gap: 12, padding: "10 24 4 24" },
  valueCard: { flex: 1, borderRadius: 4, padding: "8 10", backgroundColor: SLATE_100 },
  valueCardLabel: { fontSize: 7, color: SLATE_400, letterSpacing: 1 },
  valueCardNum: { fontSize: 13, fontWeight: "bold", color: NAVY, marginTop: 2 },
  // Narrative
  narrativeSection: { padding: "8 24 4 24" },
  narrativeText: { fontSize: 8.5, color: SLATE_600, lineHeight: 1.55 },
  // Key findings
  findingsSection: { padding: "4 24 8 24" },
  findingItem: { flexDirection: "row", gap: 6, marginBottom: 4 },
  findingBullet: { fontSize: 8, color: CRIMSON, fontWeight: "bold", marginTop: 0.5 },
  findingText: { fontSize: 8, color: SLATE_600, flex: 1 },
  // Footer
  footer: { position: "absolute", bottom: 14, left: 24, right: 24, flexDirection: "row", justifyContent: "space-between", borderTop: `0.5 solid ${SLATE_100}`, paddingTop: 6 },
  footerText: { fontSize: 7, color: SLATE_400 },
});

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function CmaReportDocument({
  estimatedValue,
  pricingRecommendation,
  marketNarrative,
  keyFindings,
  comps,
  subjectProperty,
  agentName,
  agentEmail,
  agentPhone,
}: CmaReportProps) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const sp = subjectProperty;

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerBrand}>HOMEWISE REALTY</Text>
            <Text style={s.headerSubtitle}>COMPARATIVE MARKET ANALYSIS</Text>
          </View>
          <View style={s.headerRight}>
            {agentName ? <Text style={s.headerAgentName}>{agentName}</Text> : null}
            {agentEmail ? <Text style={s.headerAgentDetail}>{agentEmail}</Text> : null}
            {agentPhone ? <Text style={s.headerAgentDetail}>{agentPhone}</Text> : null}
          </View>
        </View>

        {/* Subject property */}
        <View style={s.subjectBlock}>
          <Text style={s.sectionLabel}>Subject Property</Text>
          <Text style={s.subjectAddress}>{sp.address}, {sp.city}, FL {sp.zip}</Text>
          <View style={s.subjectStats}>
            {sp.propertyType ? (
              <View style={s.subjectStat}>
                <Text style={s.subjectStatVal}>{sp.propertyType}</Text>
                <Text style={s.subjectStatLbl}>Type</Text>
              </View>
            ) : null}
            {sp.beds ? (
              <View style={s.subjectStat}>
                <Text style={s.subjectStatVal}>{sp.beds}</Text>
                <Text style={s.subjectStatLbl}>Beds</Text>
              </View>
            ) : null}
            {sp.baths ? (
              <View style={s.subjectStat}>
                <Text style={s.subjectStatVal}>{sp.baths}</Text>
                <Text style={s.subjectStatLbl}>Baths</Text>
              </View>
            ) : null}
            {sp.sqft ? (
              <View style={s.subjectStat}>
                <Text style={s.subjectStatVal}>{sp.sqft.toLocaleString()}</Text>
                <Text style={s.subjectStatLbl}>Sq Ft</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Value range */}
        {estimatedValue ? (
          <View style={s.valueRange}>
            <View style={s.valueCard}>
              <Text style={s.valueCardLabel}>CONSERVATIVE</Text>
              <Text style={s.valueCardNum}>{fmt(estimatedValue.low)}</Text>
            </View>
            <View style={[s.valueCard, { backgroundColor: "#E8E6F5" }]}>
              <Text style={[s.valueCardLabel, { color: NAVY }]}>RECOMMENDED</Text>
              <Text style={[s.valueCardNum, { color: NAVY }]}>{fmt(estimatedValue.mid)}</Text>
            </View>
            <View style={s.valueCard}>
              <Text style={s.valueCardLabel}>AGGRESSIVE</Text>
              <Text style={s.valueCardNum}>{fmt(estimatedValue.high)}</Text>
            </View>
          </View>
        ) : null}

        {/* Comps table */}
        <View style={s.tableSection}>
          <Text style={[s.sectionLabel, { marginBottom: 6 }]}>Comparable Sales</Text>
          <View style={s.tableHeader}>
            <Text style={[s.thCell, s.colAddress]}>Address</Text>
            <Text style={[s.thCell, s.colBeds]}>Beds</Text>
            <Text style={[s.thCell, s.colBaths]}>Baths</Text>
            <Text style={[s.thCell, s.colSqft]}>Sq Ft</Text>
            <Text style={[s.thCell, s.colPrice]}>Close Price</Text>
            <Text style={[s.thCell, s.colDate]}>Close Date</Text>
            <Text style={[s.thCell, s.colDom]}>DOM</Text>
          </View>
          {comps.length === 0 ? (
            <View style={s.tableRow}>
              <Text style={[s.tdCell, { color: SLATE_400, fontStyle: "italic" }]}>No comparable sales found</Text>
            </View>
          ) : (
            comps.slice(0, 8).map((c, i) => (
              <View key={i} style={i % 2 === 1 ? s.tableRowAlt : s.tableRow}>
                <Text style={[s.tdCell, s.colAddress]}>{c.address}</Text>
                <Text style={[s.tdCell, s.colBeds]}>{c.beds}</Text>
                <Text style={[s.tdCell, s.colBaths]}>{c.baths}</Text>
                <Text style={[s.tdCell, s.colSqft]}>{c.sqft?.toLocaleString() ?? "—"}</Text>
                <Text style={[s.tdCell, s.colPrice]}>{fmt(c.soldPrice)}</Text>
                <Text style={[s.tdCell, s.colDate]}>{fmtDate(c.closeDate)}</Text>
                <Text style={[s.tdCell, s.colDom]}>{c.dom}d</Text>
              </View>
            ))
          )}
        </View>

        {/* Price recommendation band */}
        {pricingRecommendation ? (
          <View style={s.priceBand}>
            <Text style={s.priceBandLabel}>{pricingRecommendation}</Text>
          </View>
        ) : null}

        {/* Market narrative */}
        {marketNarrative ? (
          <View style={s.narrativeSection}>
            <Text style={s.sectionLabel}>Market Analysis</Text>
            <Text style={s.narrativeText}>{marketNarrative}</Text>
          </View>
        ) : null}

        {/* Key findings */}
        {keyFindings && keyFindings.length > 0 ? (
          <View style={s.findingsSection}>
            <Text style={s.sectionLabel}>Key Findings</Text>
            {keyFindings.map((f, i) => (
              <View key={i} style={s.findingItem}>
                <Text style={s.findingBullet}>•</Text>
                <Text style={s.findingText}>{f}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Prepared by Homewise Realty Group · homewisefl.com</Text>
          <Text style={s.footerText}>{today}</Text>
        </View>
      </Page>
    </Document>
  );
}
