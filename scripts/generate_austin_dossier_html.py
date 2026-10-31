#!/usr/bin/env python3
"""Generate public/reports/austin_dossier_print.html strictly from verified tx/austin data in src/data/cities/tx.json."""

from __future__ import annotations

import html
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TX_JSON_PATH = ROOT / "src" / "data" / "cities" / "tx.json"
OUT_HTML_PATH = ROOT / "public" / "reports" / "austin_dossier_print.html"

BANNED_SUBSTRINGS = [
    "$32.00",
    "$28.50",
    "$22,460",
    "22,460",
    "$16,170",
    "16,170",
    "$92,248",
    "92,248",
    "52/100",
    "Empirical Bayes",
    "LENDER COMPLIANT",
    "Lender",
    "lender",
    "zero-hallucination",
    "Zero-Hallucination",
    "ground truth",
    "CapMetro",
    "Uber/Lyft",
    "1,501 Published City Guides",
    "1,501 verified US city guides",
    "DSD Initial Review",
    "32 Business Days",
    "32-day",
    "public school zones",
    "FRED",
    "TxDOT",
    "AADT",
]


def esc(val: object) -> str:
    return html.escape(str(val))


def load_austin_record() -> dict:
    records = json.loads(TX_JSON_PATH.read_text(encoding="utf-8"))
    for rec in records:
        if rec.get("slug") == "tx/austin":
            return rec
    raise RuntimeError(f"tx/austin not found in {TX_JSON_PATH}")


def status_badge(status: str) -> str:
    st = (status or "").lower()
    if st == "underserved":
        return '<span class="badge badge-emerald">Underserved</span>'
    if st == "saturated":
        return '<span class="badge badge-rose">Saturated</span>'
    return '<span class="badge badge-blue">Balanced</span>'


def build_html() -> str:
    c = load_austin_record()
    d = c["demographics"]
    h = c["housingAndTaxes"]
    tax = c["permitsAndTax"]
    elev = c["terrainElevation"]
    clim = c["climateNormals"]
    water = c["waterUtility"]
    travel = c["executiveTravel"]
    airport = travel["primaryAirport"]
    emergency = travel["emergency"]
    hospitals = sorted(emergency.get("erHospitals", []), key=lambda x: x["name"])
    industries = c.get("industries", [])
    primary_zips = c.get("primaryZips", [])
    higher_ed = c.get("higherEducation") or {}
    ev_infra = c.get("evInfrastructure") or {}

    extra_infra_rows = ""
    if higher_ed.get("institutionCount"):
        extra_infra_rows += f"""
        <tr>
          <td><strong>Higher Education</strong></td>
          <td><strong><span class="mono">{int(higher_ed["institutionCount"]):,}</span> institutions</strong> · <span class="mono">{int(higher_ed.get("totalEnrollment", 0)):,}</span> enrolled students</td>
          <td>U.S. Department of Education College Scorecard</td>
        </tr>"""
    if ev_infra.get("totalStations"):
        extra_infra_rows += f"""
        <tr>
          <td><strong>Public EV Charging</strong></td>
          <td><strong><span class="mono">{int(ev_infra["totalStations"]):,}</span> stations</strong> · <span class="mono">{int(ev_infra.get("totalChargingPorts", 0)):,}</span> ports (<span class="mono">{int(ev_infra.get("dcFastPorts", 0)):,}</span> DC Fast / <span class="mono">{int(ev_infra.get("level2Ports", 0)):,}</span> Level 2)</td>
          <td>U.S. Dept. of Energy / NREL Alternative Fuels Data Center</td>
        </tr>"""

    pop = int(d["population"])
    pop_chg = float(d["popChange2020to2023Pct"])
    pop_chg_str = f"{'+' if pop_chg > 0 else ''}{pop_chg:.1f}%"
    mhi = int(d["medianHouseholdIncome"])
    pci = int(d["perCapitaIncome"])
    med_age = float(d["medianAge"])

    home_val = int(h["medianHomeValue"])
    gross_rent = int(h["medianGrossRent"])
    re_tax_paid = int(h["medianRealEstateTaxPaid"])
    eff_prop_tax = float(h["effectivePropertyTaxRatePct"])

    state_tax_pct = float(tax["stateTaxRate"]) * 100
    local_tax_pct = float(tax["localTaxRate"]) * 100
    comb_tax_rate = float(tax["combinedSalesTaxRate"])
    comb_tax_pct = comb_tax_rate * 100

    elev_ft = float(elev["elevationFeet"])
    elev_m = float(elev["elevationMeters"])
    topo_class = elev.get("topographyClass", "")

    summer_f = int(clim["peakSummerHighF"])
    winter_f = int(clim["winterLowF"])
    rain_in = float(clim["annualRainfallInches"])

    # Illustrative User-Input Worksheet (Not Market Rent Data) — exact-cent arithmetic (QC-16)
    sample_sqft = 1500
    sample_rent_sqft_yr = 30.00
    sample_nnn_sqft_yr = 6.00
    sample_wage = 16.00
    sample_hours_wk = 120
    sample_overhead = 1200.00
    sample_gross_ticket = 10.00
    sample_cogs_pct = 0.28

    rent_mo = round((sample_sqft * sample_rent_sqft_yr) / 12.0, 2)  # 3750.00
    nnn_mo = round((sample_sqft * sample_nnn_sqft_yr) / 12.0, 2)  # 750.00
    base_labor_raw = sample_wage * sample_hours_wk * 4.3482  # 8348.544
    base_labor_mo = round(base_labor_raw, 2)  # 8348.54
    burden_mo = round(base_labor_raw * 0.18, 2)  # 1502.74
    overhead_mo = round(sample_overhead, 2)  # 1200.00

    fixed_total_mo = round(rent_mo + nnn_mo + base_labor_mo + burden_mo + overhead_mo, 2)  # 15551.28
    assert fixed_total_mo == 15551.28, f"Unexpected fixed_total_mo: {fixed_total_mo}"

    pct_rent = round(rent_mo / fixed_total_mo * 100, 1)  # 24.1
    pct_nnn = round(nnn_mo / fixed_total_mo * 100, 1)  # 4.8
    pct_labor = round(base_labor_mo / fixed_total_mo * 100, 1)  # 53.7
    pct_burden = round(burden_mo / fixed_total_mo * 100, 1)  # 9.7
    pct_overhead = round(overhead_mo / fixed_total_mo * 100, 1)  # 7.7
    assert round(pct_rent + pct_nnn + pct_labor + pct_burden + pct_overhead, 1) == 100.0

    net_ticket = sample_gross_ticket / (1.0 + comb_tax_rate)
    cogs_per_cust = net_ticket * sample_cogs_pct
    cm_per_cust = net_ticket * (1.0 - sample_cogs_pct)
    monthly_net_rev = fixed_total_mo / (1.0 - sample_cogs_pct)
    monthly_cust = math.ceil(fixed_total_mo / cm_per_cust)
    daily_cust = math.ceil(monthly_cust / 30.4375)

    # Hospital rows HTML
    hospital_rows_html = "\n".join(
        f"""        <tr>
          <td><strong>{esc(hp["name"])}</strong></td>
          <td>{esc(hp["address"])}</td>
          <td>{esc(hp["type"])}</td>
          <td class="mono">{esc(hp["cmsFacilityId"])}</td>
        </tr>"""
        for hp in hospitals
    )

    # Industry rows HTML
    industry_rows_html = "\n".join(
        f"""        <tr>
          <td class="mono">{esc(ind["naicsCode"])}</td>
          <td><strong>{esc(ind["label"])}</strong></td>
          <td class="mono" style="text-align: right;">{int(ind["establishments"]):,}</td>
          <td class="mono" style="text-align: right;">{float(ind["per10kResidents"]):.2f}</td>
          <td class="mono" style="text-align: right;">{float(ind["usAvgPer10k"]):.2f}</td>
          <td class="mono" style="text-align: right; font-weight: 700;">{int(ind["saturationIndex"])}</td>
          <td>{status_badge(ind["status"])}</td>
        </tr>"""
        for ind in industries
    )

    zbp_quote = (
        industries[0].get("provenance", {}).get("evidenceQuote", "")
        if industries
        else ""
    )
    # Extract ZCTA summary note cleanly
    zcta_note = (
        "Employer establishments summed across 44 USPS Austin, TX ZIP codes paired with the ACS 2023 5-Year ZCTA population of those same ZIP codes (1,157,348). National benchmark = all U.S. ZBP rows divided by U.S. ACS population."
        if "1,157,348" in zbp_quote
        else esc(zbp_quote)
    )

    total_pages = 5
    doc_id = f"CC-{c['stateCode'].upper()}{c['cityId']}"

    rendered = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{esc(c["name"])}, {esc(c["stateName"])} — Primary-Sourced Municipal &amp; Commercial Dossier</title>
<style>
  @page {{
    size: letter;
    margin: 0;
  }}

  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }}

  body {{
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0F172A;
    background: #475569;
  }}

  @media print {{
    body {{
      background: #FFFFFF;
    }}
  }}

  .page {{
    width: 8.5in;
    height: 11in;
    margin: 0 auto;
    background: #FFFFFF;
    position: relative;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }}

  .page:last-child {{
    page-break-after: auto;
    break-after: auto;
  }}

  .cover-page {{
    background: linear-gradient(145deg, #090E17 0%, #0F172A 60%, #1E293B 100%);
    color: #FFFFFF;
    padding: 3.2rem 3.4rem 2.8rem 3.4rem;
    justify-content: space-between;
  }}

  .cover-grid-bg {{
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(56, 189, 248, 0.14) 1px, transparent 1px);
    background-size: 20px 20px;
    opacity: 0.6;
    pointer-events: none;
  }}

  .doc-header {{
    height: 0.55in;
    padding: 0 2.6rem;
    border-bottom: 1.5px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #64748B;
    flex-shrink: 0;
  }}

  .doc-footer {{
    height: 0.45in;
    padding: 0 2.6rem;
    border-top: 1px solid #E2E8F0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 7.5pt;
    color: #94A3B8;
    flex-shrink: 0;
  }}

  .doc-body {{
    flex: 1;
    padding: 1.5rem 2.6rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }}

  h1, h2, h3, h4 {{
    margin: 0;
    font-weight: 800;
    letter-spacing: -0.02em;
  }}

  h2 {{ font-size: 14pt; color: #0F172A; }}
  h3 {{ font-size: 10pt; color: #0F172A; margin-bottom: 3px; }}

  .badge {{
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 6.5pt;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }}
  .badge-blue {{ background: #EDF4FC; color: #1D68F2; border: 1px solid #BFDBFE; }}
  .badge-emerald {{ background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }}
  .badge-amber {{ background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }}
  .badge-rose {{ background: #FFF1F2; color: #BE123C; border: 1px solid #FECDD3; }}

  .data-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 7.8pt;
  }}
  .data-table th {{
    background: #F8FAFC;
    color: #475569;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 6.8pt;
    padding: 5px 8px;
    border-top: 1px solid #E2E8F0;
    border-bottom: 1.5px solid #CBD5E1;
    text-align: left;
  }}
  .data-table td {{
    padding: 5px 8px;
    border-bottom: 1px solid #F1F5F9;
    color: #1E293B;
    vertical-align: top;
  }}
  .data-table tr:nth-child(even) td {{ background: #FAFAFA; }}

  .compact-table td, .compact-table th {{
    padding: 4px 7px;
    font-size: 7.4pt;
  }}

  .card {{
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    padding: 10px 14px;
  }}

  .mono {{
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }}
</style>
</head>
<body>

<!-- ========================================== -->
<!-- PAGE 1: COVER PAGE -->
<!-- ========================================== -->
<div class="page cover-page">
  <div class="cover-grid-bg"></div>

  <div style="position: relative; z-index: 10;">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 1.4rem;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 34px; height: 34px; border-radius: 8px; background: #1D68F2; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; color: #FFF;">C</div>
        <div>
          <div style="font-weight: 900; font-size: 16px; letter-spacing: -0.02em;">CITY<span style="color: #38BDF8;">CLICK</span></div>
          <div style="font-size: 7pt; color: #94A3B8; letter-spacing: 0.1em; text-transform: uppercase;">Primary-Sourced Municipal Reference</div>
        </div>
      </div>
      <div style="text-align: right;">
        <div class="badge" style="background: rgba(16, 185, 129, 0.18); color: #6EE7B7; border: 1px solid rgba(110, 231, 183, 0.35);">
          PRIMARY FEDERAL &amp; STATE RECORDS
        </div>
        <div class="mono" style="font-size: 7pt; color: #94A3B8; margin-top: 4px;">DOC ID: {esc(doc_id)}</div>
      </div>
    </div>
  </div>

  <div style="position: relative; z-index: 10; margin: 2.5rem 0;">
    <div style="display: inline-block; padding: 4px 12px; background: rgba(29, 104, 242, 0.25); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; font-size: 7.5pt; font-weight: 800; color: #7DD3FC; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 1rem;">
      Municipal Demographics, Infrastructure &amp; Trade Density Dossier
    </div>
    <h1 style="font-size: 34pt; line-height: 1.08; color: #FFFFFF; font-weight: 900; margin-bottom: 0.65rem;">
      {esc(c["name"])}, {esc(c["stateName"])}
    </h1>
    <div style="font-size: 14pt; color: #94A3B8; font-weight: 500; margin-bottom: 1.8rem;">
      {esc(c["countyName"])} · Census Place FIPS {esc(c["cityId"])} · County FIPS {esc(c["countyFips"])}
    </div>

    <div style="width: 60px; height: 3px; background: #1D68F2; margin-bottom: 1.8rem;"></div>

    <p style="font-size: 9.5pt; color: #CBD5E1; max-width: 5.8in; line-height: 1.65; margin: 0;">
      An audited civic and commercial reference profile generated directly from primary federal and state datasets: U.S. Census Bureau ACS 2023 5-Year &amp; Vintage 2023 Population Estimates, Texas Comptroller retail sales-tax tables, Census 2022 ZIP Code Business Patterns (ZBP), USGS 3DEP elevation, Open-Meteo 10-year ERA5 climate reanalysis, U.S. EPA SDWIS water records, OurAirports aviation records, and CMS Care Compare emergency hospital listings.
    </p>
  </div>

  <div style="position: relative; z-index: 10;">
    <div style="background: rgba(15, 23, 42, 0.72); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 12px; padding: 1.2rem 1.4rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
      <div>
        <div style="font-size: 6.5pt; color: #94A3B8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Resident Population</div>
        <div class="mono" style="font-size: 14pt; font-weight: 900; color: #FFFFFF; margin-top: 3px;">{pop:,}</div>
        <div style="font-size: 6.5pt; color: #6EE7B7; margin-top: 2px;">{esc(pop_chg_str)} (Apr 2020–Jul 2023)</div>
      </div>
      <div>
        <div style="font-size: 6.5pt; color: #94A3B8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Median Household Inc</div>
        <div class="mono" style="font-size: 14pt; font-weight: 900; color: #FFFFFF; margin-top: 3px;">${mhi:,}</div>
        <div style="font-size: 6.5pt; color: #94A3B8; margin-top: 2px;">Census ACS 2023 5-Yr</div>
      </div>
      <div>
        <div style="font-size: 6.5pt; color: #94A3B8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Median Home Value</div>
        <div class="mono" style="font-size: 14pt; font-weight: 900; color: #FFFFFF; margin-top: 3px;">${home_val:,}</div>
        <div style="font-size: 6.5pt; color: #94A3B8; margin-top: 2px;">{eff_prop_tax:.2f}% effective prop. tax</div>
      </div>
      <div>
        <div style="font-size: 6.5pt; color: #94A3B8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Combined Sales Tax</div>
        <div class="mono" style="font-size: 14pt; font-weight: 900; color: #38BDF8; margin-top: 3px;">{comb_tax_pct:.2f}%</div>
        <div style="font-size: 6.5pt; color: #94A3B8; margin-top: 2px;">{state_tax_pct:.2f}% TX + {local_tax_pct:.2f}% local</div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.3rem; font-size: 7pt; color: #94A3B8;">
      <div>FREE PUBLIC RESOURCE · HTTPS://CITYCLICK.COM/TX/AUSTIN/</div>
      <div>PAGE 1 OF {total_pages}</div>
    </div>
  </div>
</div>

<!-- ========================================== -->
<!-- PAGE 2: DEMOGRAPHICS, HOUSING & TAXATION -->
<!-- ========================================== -->
<div class="page">
  <div class="doc-header">
    <span>CityClick Municipal Reference · {esc(c["name"])}, {esc(c["stateCode"].upper())}</span>
    <span>Section 1: Demographics, Housing &amp; Taxation</span>
  </div>

  <div class="doc-body">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;">
      <div>
        <h2>Census Demographics, Housing &amp; Tax Baselines</h2>
        <div style="font-size: 8pt; color: #64748B; margin-top: 2px;">Every metric below is read directly from verified federal Census and Texas Comptroller records.</div>
      </div>
      <div class="badge badge-blue">Place FIPS {esc(c["cityId"])}</div>
    </div>

    <!-- 4 Key Metric Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 1.2rem;">
      <div class="card" style="border-top: 3px solid #1D68F2;">
        <div style="font-size: 6.5pt; font-weight: 700; color: #64748B; text-transform: uppercase;">Population (Jul 2023)</div>
        <div class="mono" style="font-size: 15pt; font-weight: 900; color: #0F172A; margin: 4px 0;">{pop:,}</div>
        <div style="font-size: 6.8pt; color: #047857; font-weight: 700;">{esc(pop_chg_str)} vs. Apr 2020 base</div>
      </div>
      <div class="card" style="border-top: 3px solid #10B981;">
        <div style="font-size: 6.5pt; font-weight: 700; color: #64748B; text-transform: uppercase;">Median Household Inc</div>
        <div class="mono" style="font-size: 15pt; font-weight: 900; color: #0F172A; margin: 4px 0;">${mhi:,}</div>
        <div style="font-size: 6.8pt; color: #64748B;">Per-capita: ${pci:,}</div>
      </div>
      <div class="card" style="border-top: 3px solid #F59E0B;">
        <div style="font-size: 6.5pt; font-weight: 700; color: #64748B; text-transform: uppercase;">Median Gross Rent</div>
        <div class="mono" style="font-size: 15pt; font-weight: 900; color: #0F172A; margin: 4px 0;">${gross_rent:,}<span style="font-size: 8pt; color: #64748B;">/mo</span></div>
        <div style="font-size: 6.8pt; color: #64748B;">ACS Table B25064</div>
      </div>
      <div class="card" style="border-top: 3px solid #6366F1;">
        <div style="font-size: 6.5pt; font-weight: 700; color: #64748B; text-transform: uppercase;">Effective Prop. Tax</div>
        <div class="mono" style="font-size: 15pt; font-weight: 900; color: #0F172A; margin: 4px 0;">{eff_prop_tax:.2f}%</div>
        <div style="font-size: 6.8pt; color: #64748B;">${re_tax_paid:,}/yr median tax</div>
      </div>
    </div>

    <h3>1A. Demographic &amp; Household Indicators</h3>
    <div style="font-size: 7.2pt; color: #64748B; margin-bottom: 6px;">Sources: U.S. Census Bureau Population Estimates Program (Vintage 2023) &amp; ACS 2023 5-Year Table-Based Summary File</div>
    <table class="data-table" style="margin-bottom: 1.25rem;">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Verified Value</th>
          <th>Census Table / Series</th>
          <th>Reference Vintage</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Total Resident Population</strong></td>
          <td class="mono"><strong>{pop:,}</strong></td>
          <td>Population Estimates Program (SUB-EST2023)</td>
          <td class="mono">July 1, 2023</td>
        </tr>
        <tr>
          <td>Population Change (2020–2023)</td>
          <td class="mono" style="color: #047857; font-weight: 700;">{esc(pop_chg_str)}</td>
          <td>April 1, 2020 Estimates Base to July 1, 2023</td>
          <td class="mono">PEP-2023</td>
        </tr>
        <tr>
          <td><strong>Median Household Income</strong></td>
          <td class="mono"><strong>${mhi:,}</strong></td>
          <td>ACS 5-Year Table B19013</td>
          <td class="mono">2019–2023 (ACS-2023-5YR)</td>
        </tr>
        <tr>
          <td>Per-Capita Income</td>
          <td class="mono">${pci:,}</td>
          <td>ACS 5-Year Table B19301</td>
          <td class="mono">2019–2023 (ACS-2023-5YR)</td>
        </tr>
        <tr>
          <td>Median Resident Age</td>
          <td class="mono">{med_age:.1f} years</td>
          <td>ACS 5-Year Table B01002</td>
          <td class="mono">2019–2023 (ACS-2023-5YR)</td>
        </tr>
        <tr>
          <td>Top 12 USPS City ZIP Codes (by ZBP count)</td>
          <td class="mono" colspan="3">{esc(", ".join(primary_zips))}</td>
        </tr>
      </tbody>
    </table>

    <h3>1B. Owner-Occupied Housing, Rental Cost &amp; Effective Property Tax</h3>
    <div style="font-size: 7.2pt; color: #64748B; margin-bottom: 6px;">Source: {esc(h["source"])}</div>
    <table class="data-table" style="margin-bottom: 1.25rem;">
      <thead>
        <tr>
          <th>Housing &amp; Property Tax Indicator</th>
          <th>Verified Value</th>
          <th>Derivation / Census Table</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Median Owner-Occupied Home Value</strong></td>
          <td class="mono"><strong>${home_val:,}</strong></td>
          <td>ACS 2023 5-Year Table B25077 ({esc(c["name"])} place boundary)</td>
        </tr>
        <tr>
          <td><strong>Median Gross Residential Rent</strong></td>
          <td class="mono"><strong>${gross_rent:,} / month</strong></td>
          <td>ACS 2023 5-Year Table B25064</td>
        </tr>
        <tr>
          <td>Median Annual Real Estate Taxes Paid</td>
          <td class="mono">${re_tax_paid:,} / year</td>
          <td>ACS 2023 5-Year Table B25103 (owner-occupied units)</td>
        </tr>
        <tr>
          <td><strong>Effective Property Tax Rate</strong></td>
          <td class="mono"><strong>{eff_prop_tax:.2f}%</strong></td>
          <td>Computed directly as B25103 / B25077 (${re_tax_paid:,} ÷ ${home_val:,})</td>
        </tr>
      </tbody>
    </table>

    <h3>1C. Statutory General Retail Sales Tax Schedule</h3>
    <div style="font-size: 7.2pt; color: #64748B; margin-bottom: 6px;">Source: {esc(tax["provenance"]["sourceName"])} · Verified {esc(tax["provenance"]["verifiedAt"])}</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Tax Component</th>
          <th>Jurisdiction</th>
          <th>Rate</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>State General Sales &amp; Use Tax</td>
          <td>State of Texas</td>
          <td class="mono">{state_tax_pct:.2f}%</td>
        </tr>
        <tr>
          <td>Local Municipal &amp; Special District Tax</td>
          <td>{esc(c["name"])} Local Allocation ({esc(c["countyName"])})</td>
          <td class="mono">{local_tax_pct:.2f}%</td>
        </tr>
        <tr style="background: #F8FAFC;">
          <td><strong>Combined Retail Sales Tax Rate</strong></td>
          <td><strong>Total Point-of-Sale Rate</strong></td>
          <td class="mono" style="font-weight: 900; color: #0F172A;">{comb_tax_pct:.2f}%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="doc-footer">
    <span>CityClick Report {esc(doc_id)} · https://cityclick.com/tx/austin/</span>
    <span>Page 2 of {total_pages}</span>
  </div>
</div>

<!-- ========================================== -->
<!-- PAGE 3: GEOGRAPHY, WATER, AIRPORT & CMS HOSPITALS -->
<!-- ========================================== -->
<div class="page">
  <div class="doc-header">
    <span>CityClick Municipal Reference · {esc(c["name"])}, {esc(c["stateCode"].upper())}</span>
    <span>Section 2: Geography, Climate, Water, Aviation &amp; Emergency Care</span>
  </div>

  <div class="doc-body">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.9rem;">
      <div>
        <h2>Physical Environment, Utilities, Aviation &amp; Emergency Hospitals</h2>
        <div style="font-size: 8pt; color: #64748B; margin-top: 2px;">Verified from USGS 3DEP, Open-Meteo ERA5 (2015–2024), U.S. EPA SDWIS, OurAirports, and CMS Care Compare.</div>
      </div>
      <div class="badge badge-emerald">Federal Infrastructure Records</div>
    </div>

    <table class="data-table" style="margin-bottom: 1.15rem;">
      <thead>
        <tr>
          <th>Domain</th>
          <th>Verified Metric / Facility</th>
          <th>Primary Source &amp; Methodology</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Terrain Elevation</strong></td>
          <td class="mono"><strong>{elev_ft:.1f} ft</strong> ({elev_m:.1f} m) · {esc(topo_class)}</td>
          <td>USGS 3D Elevation Program (3DEP) at Census Gazetteer point ({c["lat"]}, {c["lng"]})</td>
        </tr>
        <tr>
          <td><strong>Climate (2015–2024)</strong></td>
          <td class="mono"><strong>{summer_f}°F</strong> Avg Jul High · <strong>{winter_f}°F</strong> Avg Jan Low · <strong>{rain_in:.1f}"</strong> Annual Precip</td>
          <td>{esc(clim["sourceName"])}</td>
        </tr>
        <tr>
          <td><strong>Drinking Water</strong></td>
          <td><strong>{esc(water["providerName"])}</strong> (PWSID <span class="mono">{esc(water["pwsid"])}</span>)<br><span style="font-size: 7.2pt; color: #475569;">Population served: <span class="mono">{int(water["populationServed"]):,}</span> · Primary source: {esc(water["sourceType"])}</span></td>
          <td>{esc(water["source"])} (retrieved {esc(water["retrieved"])})</td>
        </tr>
        <tr>
          <td><strong>Primary Commercial Airport</strong></td>
          <td><strong>{esc(airport["name"])} (<span class="mono">{esc(airport["iata"])}</span>)</strong><br><span style="font-size: 7.2pt; color: #475569;"><span class="mono">{float(airport["distanceMiles"]):.1f} miles</span> straight-line from {esc(airport["cityCenterMethod"])}</span></td>
          <td>OurAirports public-domain scheduled commercial service registry (retrieved {esc(airport["retrieved"])})</td>
        </tr>{extra_infra_rows}
      </tbody>
    </table>

    <h3>CMS Care Compare Hospitals with Emergency Services ({len(hospitals)} Verified Facilities)</h3>
    <div style="font-size: 7.2pt; color: #64748B; margin-bottom: 6px; line-height: 1.45;">
      {esc(emergency["erHospitalsSource"])}
    </div>

    <table class="data-table compact-table">
      <thead>
        <tr>
          <th>Hospital Facility Name</th>
          <th>Street Address</th>
          <th>CMS Hospital Type</th>
          <th>CMS ID</th>
        </tr>
      </thead>
      <tbody>
{hospital_rows_html}
      </tbody>
    </table>
  </div>

  <div class="doc-footer">
    <span>CityClick Report {esc(doc_id)} · https://cityclick.com/tx/austin/</span>
    <span>Page 3 of {total_pages}</span>
  </div>
</div>

<!-- ========================================== -->
<!-- PAGE 4: CENSUS ZBP 2022 NAICS TRADE DENSITY -->
<!-- ========================================== -->
<div class="page">
  <div class="doc-header">
    <span>CityClick Municipal Reference · {esc(c["name"])}, {esc(c["stateCode"].upper())}</span>
    <span>Section 3: Census ZBP 2022 Small-Business Trade Density</span>
  </div>

  <div class="doc-body">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
      <div>
        <h2>Census ZBP Small-Business Establishment &amp; Density Table ({len(industries)} Categories)</h2>
        <div style="font-size: 7.8pt; color: #64748B; margin-top: 2px;">U.S. Census Bureau 2022 ZIP Code Business Patterns (zbp22detail.zip) &amp; ACS 2023 ZCTA Population</div>
      </div>
      <div style="font-size: 7.2pt; color: #64748B; font-weight: 700;">100 = U.S. National ZBP Benchmark</div>
    </div>

    <p style="font-size: 7.4pt; color: #475569; line-height: 1.45; margin: 0 0 8px 0;">
      {zcta_note} Density index = <span class="mono">round((Austin_Per_10k / US_Per_10k) × 100)</span>: indices <strong>&lt; 80</strong> indicate underserved density relative to the national baseline, <strong>80–120</strong> balanced, and <strong>&gt; 120</strong> saturated.
    </p>

    <table class="data-table compact-table">
      <thead>
        <tr>
          <th>NAICS</th>
          <th>Trade / Service Category</th>
          <th style="text-align: right;">Employer Estab.</th>
          <th style="text-align: right;">Austin / 10k</th>
          <th style="text-align: right;">U.S. / 10k</th>
          <th style="text-align: right;">Index</th>
          <th>Classification</th>
        </tr>
      </thead>
      <tbody>
{industry_rows_html}
      </tbody>
    </table>
  </div>

  <div class="doc-footer">
    <span>CityClick Report {esc(doc_id)} · https://cityclick.com/tx/austin/</span>
    <span>Page 4 of {total_pages}</span>
  </div>
</div>

<!-- ========================================== -->
<!-- PAGE 5: ILLUSTRATIVE WORKSHEET & PROVENANCE LEDGER -->
<!-- ========================================== -->
<div class="page">
  <div class="doc-header">
    <span>CityClick Municipal Reference · {esc(c["name"])}, {esc(c["stateCode"].upper())}</span>
    <span>Section 4: Illustrative Breakeven Worksheet &amp; Provenance Ledger</span>
  </div>

  <div class="doc-body">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
      <div>
        <h2>Illustrative User-Input Worksheet (Not Market Rent Data)</h2>
        <div style="font-size: 7.8pt; color: #64748B; margin-top: 2px;">Sample unit-economics calculation applying Austin's verified {comb_tax_pct:.2f}% sales tax rate to user-editable assumptions</div>
      </div>
      <div class="badge badge-amber">Illustrative Example Only</div>
    </div>

    <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-left: 3.5px solid #D97706; border-radius: 8px; padding: 8px 12px; font-size: 7.4pt; color: #78350F; line-height: 1.45; margin-bottom: 10px;">
      <strong>Important Methodology Notice:</strong> CityClick never estimates or publishes commercial asking rents. The worksheet below illustrates how our interactive calculator (<span class="mono">https://cityclick.com/tools/lease-calculator/</span>) computes breakeven volume when an operator enters an illustrative <strong>1,500 sq ft</strong> space at a sample <strong>$30.00/sq ft/yr</strong> user-quoted base rent, <strong>$6.00/sq ft/yr</strong> NNN/CAM, <strong>120 staff hrs/wk @ $16.00/hr</strong> (+18% payroll load), <strong>$1,200.00/mo</strong> fixed overhead, <strong>$10.00</strong> gross ticket, and <strong>28.0%</strong> COGS.
    </div>

    <table class="data-table compact-table" style="margin-bottom: 10px;">
      <thead>
        <tr>
          <th>Illustrative Fixed Cost Line Item</th>
          <th>Formula &amp; Sample User Input</th>
          <th style="text-align: right;">Monthly Amount</th>
          <th style="text-align: right;">Share</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Illustrative Quoted Base Rent</strong></td>
          <td>1,500 sq ft × $30.00 / sq ft / yr ÷ 12 months (user-entered sample quote)</td>
          <td class="mono" style="text-align: right; font-weight: 700;">${rent_mo:,.2f}</td>
          <td class="mono" style="text-align: right;">{pct_rent:.1f}%</td>
        </tr>
        <tr>
          <td><strong>Illustrative Quoted NNN / CAM</strong></td>
          <td>1,500 sq ft × $6.00 / sq ft / yr ÷ 12 months (user-entered sample pass-through)</td>
          <td class="mono" style="text-align: right; font-weight: 700;">${nnn_mo:,.2f}</td>
          <td class="mono" style="text-align: right;">{pct_nnn:.1f}%</td>
        </tr>
        <tr>
          <td><strong>Illustrative Base Hourly Payroll</strong></td>
          <td>120 staff hrs/wk × $16.00/hr × 4.3482 weeks/month</td>
          <td class="mono" style="text-align: right; font-weight: 700;">${base_labor_mo:,.2f}</td>
          <td class="mono" style="text-align: right;">{pct_labor:.1f}%</td>
        </tr>
        <tr>
          <td><strong>Employer Payroll Tax &amp; Benefits (18%)</strong></td>
          <td>18.0% employer payroll burden on base hourly wages</td>
          <td class="mono" style="text-align: right; font-weight: 700;">${burden_mo:,.2f}</td>
          <td class="mono" style="text-align: right;">{pct_burden:.1f}%</td>
        </tr>
        <tr>
          <td><strong>Illustrative Monthly Operating Overhead</strong></td>
          <td>Utilities, insurance, POS software, and fixed monthly services</td>
          <td class="mono" style="text-align: right; font-weight: 700;">${overhead_mo:,.2f}</td>
          <td class="mono" style="text-align: right;">{pct_overhead:.1f}%</td>
        </tr>
        <tr style="background: #F8FAFC; border-top: 1.5px solid #CBD5E1;">
          <td><strong>TOTAL ILLUSTRATIVE MONTHLY FIXED COST</strong></td>
          <td>Exact sum of line items above ($3,750.00 + $750.00 + $8,348.54 + $1,502.74 + $1,200.00)</td>
          <td class="mono" style="text-align: right; font-weight: 900; color: #0F172A;">${fixed_total_mo:,.2f}</td>
          <td class="mono" style="text-align: right; font-weight: 900;">100.0%</td>
        </tr>
      </tbody>
    </table>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 1.1rem;">
      <div class="card" style="background: #F8FAFC;">
        <div style="font-size: 6.5pt; font-weight: 700; color: #64748B; text-transform: uppercase;">Net Ticket &amp; Margin</div>
        <div class="mono" style="font-size: 11pt; font-weight: 800; color: #0F172A; margin-top: 2px;">${net_ticket:.2f} net · ${cm_per_cust:.2f} CM</div>
        <div style="font-size: 6.5pt; color: #64748B; margin-top: 2px;">$10.00 ÷ 1.0825 tax − ${cogs_per_cust:.2f} COGS (28%)</div>
      </div>
      <div class="card" style="background: #F8FAFC;">
        <div style="font-size: 6.5pt; font-weight: 700; color: #64748B; text-transform: uppercase;">Illustrative Monthly Net Rev</div>
        <div class="mono" style="font-size: 11pt; font-weight: 800; color: #0F172A; margin-top: 2px;">${monthly_net_rev:,.2f}</div>
        <div style="font-size: 6.5pt; color: #64748B; margin-top: 2px;">${fixed_total_mo:,.2f} fixed cost ÷ (1 − 0.28)</div>
      </div>
      <div class="card" style="background: #EDF4FC; border-color: #BFDBFE;">
        <div style="font-size: 6.5pt; font-weight: 700; color: #1D68F2; text-transform: uppercase;">Illustrative Breakeven Volume</div>
        <div class="mono" style="font-size: 11pt; font-weight: 900; color: #152438; margin-top: 2px;">{daily_cust} / day ({monthly_cust:,} / mo)</div>
        <div style="font-size: 6.5pt; color: #475569; margin-top: 2px;">ceil(${fixed_total_mo:,.2f} ÷ $6.6513) ÷ 30.4375 days</div>
      </div>
    </div>

    <h3>Primary Source Provenance Audit Ledger</h3>
    <div style="font-size: 7.2pt; color: #64748B; margin-bottom: 6px;">Every verified Austin metric in Sections 1–3 traces directly to the primary public datasets below.</div>
    <table class="data-table compact-table" style="margin-bottom: 0.9rem;">
      <thead>
        <tr>
          <th>Dataset</th>
          <th>Agency</th>
          <th>Vintage</th>
          <th>Primary Source URL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>ACS 5-Year Summary File</strong></td>
          <td>U.S. Census Bureau</td>
          <td class="mono">ACS-2023-5YR</td>
          <td class="mono" style="font-size: 6.4pt;">www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/</td>
        </tr>
        <tr>
          <td><strong>Population Estimates (SUB-EST2023)</strong></td>
          <td>U.S. Census Bureau</td>
          <td class="mono">PEP-2023</td>
          <td class="mono" style="font-size: 6.4pt;">www2.census.gov/programs-surveys/popest/datasets/2020-2023/cities/totals/sub-est2023.csv</td>
        </tr>
        <tr>
          <td><strong>ZIP Code Business Patterns</strong></td>
          <td>U.S. Census Bureau</td>
          <td class="mono">ZBP-2022</td>
          <td class="mono" style="font-size: 6.4pt;">www2.census.gov/programs-surveys/cbp/datasets/2022/zbp22detail.zip</td>
        </tr>
        <tr>
          <td><strong>Texas City Sales Tax Rates</strong></td>
          <td>Texas Comptroller</td>
          <td class="mono">2026</td>
          <td class="mono" style="font-size: 6.4pt;">comptroller.texas.gov/taxes/sales/docs/city-rates.pdf</td>
        </tr>
        <tr>
          <td><strong>3DEP Elevation &amp; 2023 Gazetteer</strong></td>
          <td>USGS &amp; U.S. Census</td>
          <td class="mono">2023–2026</td>
          <td class="mono" style="font-size: 6.4pt;">epqs.nationalmap.gov · census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html</td>
        </tr>
        <tr>
          <td><strong>ERA5 Historical Reanalysis</strong></td>
          <td>Open-Meteo Archive</td>
          <td class="mono">2015–2024</td>
          <td class="mono" style="font-size: 6.4pt;">open-meteo.com/en/docs/historical-weather-api</td>
        </tr>
        <tr>
          <td><strong>SDWIS Community Water Systems</strong></td>
          <td>U.S. EPA Envirofacts</td>
          <td class="mono">2026-10-18</td>
          <td class="mono" style="font-size: 6.4pt;">data.epa.gov/efservice/WATER_SYSTEM/PWSID/TX2270001/JSON</td>
        </tr>
        <tr>
          <td><strong>Scheduled Commercial Airports</strong></td>
          <td>OurAirports</td>
          <td class="mono">2026-10-19</td>
          <td class="mono" style="font-size: 6.4pt;">ourairports.com/data/</td>
        </tr>
        <tr>
          <td><strong>Hospital General Information</strong></td>
          <td>CMS Care Compare</td>
          <td class="mono">2026-10-19</td>
          <td class="mono" style="font-size: 6.4pt;">data.cms.gov/provider-data/dataset/xubh-q36u</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size: 6.6pt; color: #64748B; line-height: 1.45; border-top: 1px solid #E2E8F0; padding-top: 6px;">
      <strong>PUBLIC RECORD NOTICE:</strong> Compiled by CityClick, Inc. from official federal and state public records as an informational civic reference. Tax schedules, utility boundaries, and local ordinances are subject to statutory revision; always confirm site-specific terms directly with the relevant Texas or City of Austin agency prior to signing binding agreements.
    </div>
  </div>

  <div class="doc-footer">
    <span>CityClick Report {esc(doc_id)} · https://cityclick.com/tx/austin/</span>
    <span>Page 5 of {total_pages}</span>
  </div>
</div>

</body>
</html>
"""

    for banned in BANNED_SUBSTRINGS:
        if banned in rendered:
            raise AssertionError(f"Generated HTML contains banned substring: {banned!r}")

    return rendered


def generate_html() -> Path:
    OUT_HTML_PATH.parent.mkdir(parents=True, exist_ok=True)
    content = build_html()
    OUT_HTML_PATH.write_text(content, encoding="utf-8")
    print(f"Wrote {OUT_HTML_PATH} ({OUT_HTML_PATH.stat().st_size:,} bytes)")
    return OUT_HTML_PATH


if __name__ == "__main__":
    generate_html()
