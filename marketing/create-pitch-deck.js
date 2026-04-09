const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaExclamationTriangle, FaBell, FaDollarSign, FaHeart, FaHandshake, FaChartLine, FaLightbulb, FaRocket, FaVideo, FaLink, FaMicrophone, FaDesktop, FaEnvelope, FaFilter, FaInfinity } = require("react-icons/fa");

function renderIconSvg(IconComponent, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}

async function createDeck() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "CardWatch";
  pres.title = "CardWatch Creator Partnership";

  // Colors
  const DARK = "1A1A2E";
  const DARK_MID = "16213E";
  const ORANGE = "FF6B35";
  const ORANGE_LIGHT = "FF8C5A";
  const WHITE = "FFFFFF";
  const LIGHT_GRAY = "E8E8E8";
  const MUTED = "A0A0B8";
  const CARD_BG = "222244";

  // Helper: create shadow factory (never reuse shadow objects)
  const cardShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.25 });

  // Pre-render icons
  const iconAlert = await iconToBase64Png(FaExclamationTriangle, "#FF6B35");
  const iconBell = await iconToBase64Png(FaBell, "#FF6B35");
  const iconDollar = await iconToBase64Png(FaDollarSign, "#FF6B35");
  const iconHeart = await iconToBase64Png(FaHeart, "#FF6B35");
  const iconChart = await iconToBase64Png(FaChartLine, "#FF6B35");
  const iconRocket = await iconToBase64Png(FaRocket, "#FF6B35");
  const iconVideo = await iconToBase64Png(FaVideo, "#FFFFFF");
  const iconLink = await iconToBase64Png(FaLink, "#FFFFFF");
  const iconMic = await iconToBase64Png(FaMicrophone, "#FFFFFF");
  const iconDesktop = await iconToBase64Png(FaDesktop, "#FFFFFF");
  const iconEnvelope = await iconToBase64Png(FaEnvelope, "#FF6B35");
  const iconFilter = await iconToBase64Png(FaFilter, "#FF6B35");
  const iconInfinity = await iconToBase64Png(FaInfinity, "#FF6B35");

  // ========== SLIDE 1: Title ==========
  let slide1 = pres.addSlide();
  slide1.background = { color: DARK };

  // Orange accent bar at top
  slide1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: ORANGE } });

  // Large icon
  slide1.addImage({ data: iconBell, x: 4.4, y: 0.8, w: 1.2, h: 1.2 });

  slide1.addText("CardWatch", {
    x: 0.5, y: 2.1, w: 9, h: 0.8,
    fontSize: 48, fontFace: "Trebuchet MS", color: WHITE, bold: true, align: "center", margin: 0
  });
  slide1.addText("Creator Partnership", {
    x: 0.5, y: 2.8, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Trebuchet MS", color: ORANGE, bold: true, align: "center", margin: 0
  });
  slide1.addText("Earn money sharing a tool your audience will actually use", {
    x: 1.5, y: 3.6, w: 7, h: 0.5,
    fontSize: 16, fontFace: "Calibri", color: MUTED, align: "center", margin: 0
  });

  // Bottom bar
  slide1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.1, w: 10, h: 0.525, fill: { color: DARK_MID } });
  slide1.addText("mycardwatch.com/partners", {
    x: 0.5, y: 5.1, w: 9, h: 0.525,
    fontSize: 13, fontFace: "Calibri", color: ORANGE, align: "center", valign: "middle", margin: 0
  });

  // ========== SLIDE 2: The Problem ==========
  let slide2 = pres.addSlide();
  slide2.background = { color: DARK };
  slide2.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: ORANGE } });

  slide2.addImage({ data: iconAlert, x: 0.6, y: 0.3, w: 0.45, h: 0.45 });
  slide2.addText("Your Audience Is Missing Deals Every Day", {
    x: 1.2, y: 0.3, w: 8, h: 0.55,
    fontSize: 28, fontFace: "Trebuchet MS", color: WHITE, bold: true, margin: 0
  });

  const problems = [
    { title: "Sniped in Minutes", desc: "Underpriced sports cards get bought within minutes on eBay. If you're not watching, someone else gets the deal." },
    { title: "Manual Search is Broken", desc: "Scrolling through eBay takes 30-60 minutes a day and still misses most of the best listings." },
    { title: "Saved Searches Are Too Slow", desc: "eBay's saved searches only update every few hours — by then, the deals are long gone." }
  ];

  problems.forEach((p, i) => {
    const y = 1.2 + i * 1.35;
    slide2.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y, w: 8.8, h: 1.1,
      fill: { color: CARD_BG }, shadow: cardShadow()
    });
    slide2.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y, w: 0.07, h: 1.1,
      fill: { color: ORANGE }
    });
    slide2.addText(p.title, {
      x: 1.0, y: y + 0.12, w: 8, h: 0.35,
      fontSize: 18, fontFace: "Trebuchet MS", color: ORANGE, bold: true, margin: 0
    });
    slide2.addText(p.desc, {
      x: 1.0, y: y + 0.5, w: 8, h: 0.45,
      fontSize: 13, fontFace: "Calibri", color: LIGHT_GRAY, margin: 0
    });
  });

  // ========== SLIDE 3: The Solution ==========
  let slide3 = pres.addSlide();
  slide3.background = { color: DARK };
  slide3.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: ORANGE } });

  slide3.addImage({ data: iconBell, x: 0.6, y: 0.3, w: 0.45, h: 0.45 });
  slide3.addText("CardWatch: eBay Alerts Every 15 Minutes", {
    x: 1.2, y: 0.3, w: 8, h: 0.55,
    fontSize: 28, fontFace: "Trebuchet MS", color: WHITE, bold: true, margin: 0
  });

  const features = [
    { icon: iconBell, title: "15-Minute Scans", desc: "Monitors eBay as often as every 15 minutes for new listings" },
    { icon: iconEnvelope, title: "Rich Email Alerts", desc: "Card images, prices, and direct eBay links in every alert" },
    { icon: iconFilter, title: "Advanced Filters", desc: "Condition, price range, listing type, and seller rating" },
    { icon: iconInfinity, title: "Unlimited Watchlists", desc: "Any player, any set, any card type — no limits" }
  ];

  features.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.6 + col * 4.5;
    const y = 1.2 + row * 1.9;

    slide3.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.2, h: 1.6,
      fill: { color: CARD_BG }, shadow: cardShadow()
    });
    slide3.addImage({ data: f.icon, x: x + 0.3, y: y + 0.35, w: 0.5, h: 0.5 });
    slide3.addText(f.title, {
      x: x + 1.0, y: y + 0.25, w: 2.8, h: 0.35,
      fontSize: 17, fontFace: "Trebuchet MS", color: ORANGE, bold: true, margin: 0
    });
    slide3.addText(f.desc, {
      x: x + 1.0, y: y + 0.65, w: 2.8, h: 0.7,
      fontSize: 12, fontFace: "Calibri", color: LIGHT_GRAY, margin: 0
    });
  });

  // ========== SLIDE 4: Real Example ==========
  let slide4 = pres.addSlide();
  slide4.background = { color: DARK };
  slide4.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: ORANGE } });

  slide4.addText("One Alert. One Card. $135 Profit.", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 30, fontFace: "Trebuchet MS", color: WHITE, bold: true, align: "center", margin: 0
  });

  // Central example card
  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 1.5, y: 1.2, w: 7, h: 3.2,
    fill: { color: CARD_BG }, shadow: cardShadow()
  });
  slide4.addShape(pres.shapes.RECTANGLE, {
    x: 1.5, y: 1.2, w: 7, h: 0.07,
    fill: { color: ORANGE }
  });

  slide4.addText("2024 Topps Chrome Refractor", {
    x: 1.8, y: 1.5, w: 6.4, h: 0.4,
    fontSize: 18, fontFace: "Trebuchet MS", color: WHITE, bold: true, margin: 0
  });

  // Stats row
  const stats = [
    { label: "LISTED AT", value: "$45", color: WHITE },
    { label: "MARKET VALUE", value: "$180", color: ORANGE },
    { label: "YOUR PROFIT", value: "$135", color: "4ADE80" }
  ];

  stats.forEach((s, i) => {
    const x = 2.0 + i * 2.2;
    slide4.addText(s.label, {
      x, y: 2.2, w: 2, h: 0.3,
      fontSize: 11, fontFace: "Calibri", color: MUTED, align: "center", margin: 0, charSpacing: 2
    });
    slide4.addText(s.value, {
      x, y: 2.5, w: 2, h: 0.7,
      fontSize: 42, fontFace: "Trebuchet MS", color: s.color, bold: true, align: "center", margin: 0
    });
  });

  slide4.addText("One card pays for a year of CardWatch", {
    x: 1.8, y: 3.5, w: 6.4, h: 0.5,
    fontSize: 16, fontFace: "Calibri", color: ORANGE, italic: true, align: "center", margin: 0
  });

  // Bottom note
  slide4.addText("Your audience catches deals like this every week", {
    x: 1, y: 4.7, w: 8, h: 0.4,
    fontSize: 14, fontFace: "Calibri", color: MUTED, align: "center", margin: 0
  });

  // ========== SLIDE 5: Why Creators Love It ==========
  let slide5 = pres.addSlide();
  slide5.background = { color: DARK };
  slide5.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: ORANGE } });

  slide5.addImage({ data: iconHeart, x: 0.6, y: 0.3, w: 0.45, h: 0.45 });
  slide5.addText("Why Creators Love Partnering With CardWatch", {
    x: 1.2, y: 0.3, w: 8.3, h: 0.55,
    fontSize: 26, fontFace: "Trebuchet MS", color: WHITE, bold: true, margin: 0
  });

  const reasons = [
    { num: "01", title: "Real Value for Your Audience", desc: "Your followers save real money on cards they're already buying. You're not pushing something useless — you're giving them an edge." },
    { num: "02", title: "The Product Sells Itself", desc: "Just show a deal catch on camera. Screen-record an alert, show the listing price vs. comps, and let the numbers do the talking." },
    { num: "03", title: "Zero Friction to Try", desc: "3-day free trial with no credit card required. Your audience can try it risk-free — which means higher conversion on your recommendations." }
  ];

  reasons.forEach((r, i) => {
    const y = 1.2 + i * 1.35;
    slide5.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y, w: 8.8, h: 1.1,
      fill: { color: CARD_BG }, shadow: cardShadow()
    });
    slide5.addText(r.num, {
      x: 0.9, y: y + 0.2, w: 0.6, h: 0.6,
      fontSize: 28, fontFace: "Trebuchet MS", color: ORANGE, bold: true, margin: 0
    });
    slide5.addText(r.title, {
      x: 1.6, y: y + 0.12, w: 7.5, h: 0.35,
      fontSize: 17, fontFace: "Trebuchet MS", color: WHITE, bold: true, margin: 0
    });
    slide5.addText(r.desc, {
      x: 1.6, y: y + 0.5, w: 7.5, h: 0.5,
      fontSize: 12, fontFace: "Calibri", color: LIGHT_GRAY, margin: 0
    });
  });

  // ========== SLIDE 6: The Deal ==========
  let slide6 = pres.addSlide();
  slide6.background = { color: DARK };
  slide6.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: ORANGE } });

  slide6.addImage({ data: iconDollar, x: 0.6, y: 0.3, w: 0.45, h: 0.45 });
  slide6.addText("What You Earn", {
    x: 1.2, y: 0.3, w: 8, h: 0.55,
    fontSize: 30, fontFace: "Trebuchet MS", color: WHITE, bold: true, margin: 0
  });

  // Commission cards
  const commissions = [
    { period: "MONTH 1", rate: "100%", amount: "$9.99 per referral", desc: "You keep the entire first month's subscription" },
    { period: "MONTHS 2-12", rate: "20%", amount: "$1.99/mo per referral", desc: "Ongoing recurring commission for active users" }
  ];

  commissions.forEach((c, i) => {
    const x = 0.6 + i * 4.5;
    slide6.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.2, w: 4.2, h: 2.2,
      fill: { color: CARD_BG }, shadow: cardShadow()
    });
    slide6.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.2, w: 4.2, h: 0.07,
      fill: { color: ORANGE }
    });
    slide6.addText(c.period, {
      x, y: 1.45, w: 4.2, h: 0.3,
      fontSize: 12, fontFace: "Calibri", color: MUTED, align: "center", margin: 0, charSpacing: 3
    });
    slide6.addText(c.rate, {
      x, y: 1.75, w: 4.2, h: 0.7,
      fontSize: 48, fontFace: "Trebuchet MS", color: ORANGE, bold: true, align: "center", margin: 0
    });
    slide6.addText(c.amount, {
      x, y: 2.45, w: 4.2, h: 0.35,
      fontSize: 16, fontFace: "Calibri", color: WHITE, bold: true, align: "center", margin: 0
    });
    slide6.addText(c.desc, {
      x: x + 0.3, y: 2.85, w: 3.6, h: 0.35,
      fontSize: 11, fontFace: "Calibri", color: MUTED, align: "center", margin: 0
    });
  });

  // Plus bonus
  slide6.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 3.7, w: 8.8, h: 0.8,
    fill: { color: CARD_BG }, shadow: cardShadow()
  });
  slide6.addText([
    { text: "PLUS  ", options: { color: ORANGE, bold: true, fontSize: 14 } },
    { text: "Free lifetime CardWatch account with all features", options: { color: WHITE, fontSize: 14 } }
  ], {
    x: 0.6, y: 3.7, w: 8.8, h: 0.8,
    fontFace: "Calibri", align: "center", valign: "middle", margin: 0
  });

  slide6.addText("Example: 50 referrals = ~$1,265 in year one", {
    x: 1, y: 4.8, w: 8, h: 0.4,
    fontSize: 15, fontFace: "Calibri", color: ORANGE, italic: true, align: "center", margin: 0
  });

  // ========== SLIDE 7: Earnings Potential ==========
  let slide7 = pres.addSlide();
  slide7.background = { color: DARK };
  slide7.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: ORANGE } });

  slide7.addImage({ data: iconChart, x: 0.6, y: 0.3, w: 0.45, h: 0.45 });
  slide7.addText("Your Earnings Potential", {
    x: 1.2, y: 0.3, w: 8, h: 0.55,
    fontSize: 30, fontFace: "Trebuchet MS", color: WHITE, bold: true, margin: 0
  });

  // Table
  const tableHeader = [
    { text: "Referrals", options: { fill: { color: ORANGE }, color: WHITE, bold: true, fontSize: 14, fontFace: "Calibri", align: "center", valign: "middle" } },
    { text: "Month 1", options: { fill: { color: ORANGE }, color: WHITE, bold: true, fontSize: 14, fontFace: "Calibri", align: "center", valign: "middle" } },
    { text: "Year 1 Total", options: { fill: { color: ORANGE }, color: WHITE, bold: true, fontSize: 14, fontFace: "Calibri", align: "center", valign: "middle" } }
  ];

  const tableRows = [
    ["25", "$249", "$633"],
    ["50", "$499", "$1,265"],
    ["100", "$999", "$2,531"],
    ["250", "$2,497", "$6,327"]
  ];

  const tableData = [tableHeader];
  tableRows.forEach((row, i) => {
    const bgColor = i % 2 === 0 ? CARD_BG : DARK_MID;
    tableData.push(row.map((cell, j) => ({
      text: cell,
      options: {
        fill: { color: bgColor },
        color: j === 2 ? ORANGE : WHITE,
        bold: j === 2,
        fontSize: 15,
        fontFace: "Calibri",
        align: "center",
        valign: "middle"
      }
    })));
  });

  slide7.addTable(tableData, {
    x: 1.5, y: 1.2, w: 7, h: 3,
    colW: [2.3, 2.3, 2.4],
    rowH: [0.5, 0.55, 0.55, 0.55, 0.55],
    border: { pt: 0.5, color: "333355" }
  });

  slide7.addText("Based on $9.99/month pricing with 70% user retention through month 12", {
    x: 1, y: 4.5, w: 8, h: 0.4,
    fontSize: 11, fontFace: "Calibri", color: MUTED, align: "center", margin: 0
  });

  // ========== SLIDE 8: Content Ideas ==========
  let slide8 = pres.addSlide();
  slide8.background = { color: DARK };
  slide8.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: ORANGE } });

  slide8.addText("Content That Takes 5 Minutes", {
    x: 0.5, y: 0.3, w: 9, h: 0.55,
    fontSize: 30, fontFace: "Trebuchet MS", color: WHITE, bold: true, align: "center", margin: 0
  });

  const ideas = [
    { icon: iconDesktop, title: "Screen-Record a Deal Catch", desc: "Show the alert email, the eBay listing, and the comp prices side by side" },
    { icon: iconVideo, title: "\"How I Find Deals\" Video", desc: "Quick walkthrough of setting up a watchlist — your audience learns something useful" },
    { icon: iconLink, title: "Pin Your Referral Link", desc: "Add your link to every video description — passive referrals from your back catalog" },
    { icon: iconMic, title: "Mention It Naturally", desc: "During card breaks or haul videos: \"I actually found this card through my eBay alerts\"" }
  ];

  ideas.forEach((idea, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.6 + col * 4.5;
    const y = 1.2 + row * 1.9;

    slide8.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.2, h: 1.6,
      fill: { color: CARD_BG }, shadow: cardShadow()
    });
    // Icon circle
    slide8.addShape(pres.shapes.OVAL, {
      x: x + 0.25, y: y + 0.3, w: 0.7, h: 0.7,
      fill: { color: ORANGE }
    });
    slide8.addImage({ data: idea.icon, x: x + 0.38, y: y + 0.43, w: 0.44, h: 0.44 });

    slide8.addText(idea.title, {
      x: x + 1.15, y: y + 0.2, w: 2.75, h: 0.35,
      fontSize: 16, fontFace: "Trebuchet MS", color: WHITE, bold: true, margin: 0
    });
    slide8.addText(idea.desc, {
      x: x + 1.15, y: y + 0.6, w: 2.75, h: 0.7,
      fontSize: 11, fontFace: "Calibri", color: LIGHT_GRAY, margin: 0
    });
  });

  // ========== SLIDE 9: Get Started ==========
  let slide9 = pres.addSlide();
  slide9.background = { color: DARK };
  slide9.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: ORANGE } });

  slide9.addImage({ data: iconRocket, x: 4.4, y: 0.5, w: 1.2, h: 1.2 });

  slide9.addText("Get Started in 3 Steps", {
    x: 0.5, y: 1.8, w: 9, h: 0.6,
    fontSize: 32, fontFace: "Trebuchet MS", color: WHITE, bold: true, align: "center", margin: 0
  });

  const steps = [
    { num: "1", text: "Sign up at mycardwatch.com/partners" },
    { num: "2", text: "Get your unique referral link" },
    { num: "3", text: "Share with your audience and start earning" }
  ];

  steps.forEach((s, i) => {
    const x = 0.8 + i * 3.0;
    // Number circle
    slide9.addShape(pres.shapes.OVAL, {
      x: x + 1.0, y: 2.7, w: 0.7, h: 0.7,
      fill: { color: ORANGE }
    });
    slide9.addText(s.num, {
      x: x + 1.0, y: 2.7, w: 0.7, h: 0.7,
      fontSize: 24, fontFace: "Trebuchet MS", color: WHITE, bold: true, align: "center", valign: "middle", margin: 0
    });
    slide9.addText(s.text, {
      x: x + 0.1, y: 3.55, w: 2.5, h: 0.7,
      fontSize: 14, fontFace: "Calibri", color: LIGHT_GRAY, align: "center", margin: 0
    });
  });

  // CTA button
  slide9.addShape(pres.shapes.RECTANGLE, {
    x: 3, y: 4.5, w: 4, h: 0.6,
    fill: { color: ORANGE }
  });
  slide9.addText("mycardwatch.com/partners", {
    x: 3, y: 4.5, w: 4, h: 0.6,
    fontSize: 18, fontFace: "Trebuchet MS", color: WHITE, bold: true, align: "center", valign: "middle", margin: 0
  });

  slide9.addText("Questions? Email Pierce directly", {
    x: 1, y: 5.15, w: 8, h: 0.35,
    fontSize: 12, fontFace: "Calibri", color: MUTED, align: "center", margin: 0
  });

  // Write file
  await pres.writeFile({ fileName: "/Users/piercepaul/github security check/cardwatch/marketing/cardwatch-creator-pitch.pptx" });
  console.log("Pitch deck created successfully!");
}

createDeck().catch(console.error);
