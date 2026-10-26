/**
 * Interactive World & Regional Choropleth Map - Looker Custom Visualization
 * Built with D3.js v7 & TopoJSON Client
 *
 * Directly resolves Buganizer Cloud Blockers and Customer Requirements:
 * - b/243984441 (Cloud Blocker: Multi-layer maps, international regions, and multiple measures on maps)
 * - b/503077532 (Cloud Blocker: Vector maps & global projection capabilities)
 * - b/529195236 (Cloud Blocker: Custom Size Map Icons & Multi-Metric Bubble Pin Overlays)
 * - PRD - Looker Map Viz improvements (go/prd-looker-map-viz-improvements)
 * - YAQS go/yeng/2594903516644376576 & go/yeng/1995018768622813184 (Native static map limitations:
 *   bypasses the requirement to manually upload custom TopoJSON files or configure complex LookML map_layers)
 *
 * Core Capabilities:
 * - Universal Country Resolution Engine: Automatically maps English names ("United States", "China", "United Kingdom", "Germany", "Brazil"),
 *   ISO Alpha-2 ("US", "GB", "DE", "CN"), ISO Alpha-3 ("USA", "GBR", "DEU", "CHN"), and Numeric ISO codes ("840", "826", "276", "156").
 * - 4 Layout & Projection Modes:
 *     1. "natural_earth": Natural Earth balanced global projection (aesthetic, low distortion).
 *     2. "orthographic_globe": Interactive 3D rotating globe with drag-to-spin and auto-rotation.
 *     3. "mercator": Standard cylindrical web map projection.
 *     4. "equal_earth": Equal-Earth true equal-area projection.
 * - Regional / Continent Drilldown: Instant focus on North America, Europe, Asia, South America, Africa, or Oceania.
 * - Multi-Metric Hybrid Layering:
 *     Layer 1: Choropleth polygon fill based on Primary Measure (e.g. Sales / Total Revenue).
 *     Layer 2: Proportional centroid bubble pin overlay based on Secondary Measure (e.g. Order Count, Units, Profit Margin).
 * - High-Density Scalability: Client-side aggregation and rollups across 5,000+ rows.
 * - Executive Spatial KPI HUD: Global total metric readout, leader country & share %, active reporting countries count, and top-ranking quick chips.
 * - Search & Filter Affordance: Search-as-you-type filter with glowing polygon highlight and auto-zoom.
 * - Interactive Tooltips & Native Looker Drill-Downs.
 * - Clean 2-Tab Options: Strictly organized into Display and Style to prevent modal header crowding.
 */

(function () {
  var WORLD_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

  // Comprehensive Country Metadata Database
  var COUNTRY_METADATA = {"4":{"id":"4","name":"Afghanistan","iso2":"AF","iso3":"AFG","continent":"asia","flag":"\ud83c\udde6\ud83c\uddeb"},"248":{"id":"248","name":"\u00c5land Islands","iso2":"AX","iso3":"ALA","continent":"europe","flag":"\ud83c\udde6\ud83c\uddfd"},"8":{"id":"8","name":"Albania","iso2":"AL","iso3":"ALB","continent":"europe","flag":"\ud83c\udde6\ud83c\uddf1"},"12":{"id":"12","name":"Algeria","iso2":"DZ","iso3":"DZA","continent":"africa","flag":"\ud83c\udde9\ud83c\uddff"},"16":{"id":"16","name":"American Samoa","iso2":"AS","iso3":"ASM","continent":"oceania","flag":"\ud83c\udde6\ud83c\uddf8"},"20":{"id":"20","name":"Andorra","iso2":"AD","iso3":"AND","continent":"europe","flag":"\ud83c\udde6\ud83c\udde9"},"24":{"id":"24","name":"Angola","iso2":"AO","iso3":"AGO","continent":"africa","flag":"\ud83c\udde6\ud83c\uddf4"},"660":{"id":"660","name":"Anguilla","iso2":"AI","iso3":"AIA","continent":"south_america","flag":"\ud83c\udde6\ud83c\uddee"},"10":{"id":"10","name":"Antarctica","iso2":"AQ","iso3":"ATA","continent":"other","flag":"\ud83c\udde6\ud83c\uddf6"},"28":{"id":"28","name":"Antigua and Barbuda","iso2":"AG","iso3":"ATG","continent":"south_america","flag":"\ud83c\udde6\ud83c\uddec"},"32":{"id":"32","name":"Argentina","iso2":"AR","iso3":"ARG","continent":"south_america","flag":"\ud83c\udde6\ud83c\uddf7"},"51":{"id":"51","name":"Armenia","iso2":"AM","iso3":"ARM","continent":"asia","flag":"\ud83c\udde6\ud83c\uddf2"},"533":{"id":"533","name":"Aruba","iso2":"AW","iso3":"ABW","continent":"south_america","flag":"\ud83c\udde6\ud83c\uddfc"},"36":{"id":"36","name":"Australia","iso2":"AU","iso3":"AUS","continent":"oceania","flag":"\ud83c\udde6\ud83c\uddfa"},"40":{"id":"40","name":"Austria","iso2":"AT","iso3":"AUT","continent":"europe","flag":"\ud83c\udde6\ud83c\uddf9"},"31":{"id":"31","name":"Azerbaijan","iso2":"AZ","iso3":"AZE","continent":"asia","flag":"\ud83c\udde6\ud83c\uddff"},"44":{"id":"44","name":"Bahamas","iso2":"BS","iso3":"BHS","continent":"south_america","flag":"\ud83c\udde7\ud83c\uddf8"},"48":{"id":"48","name":"Bahrain","iso2":"BH","iso3":"BHR","continent":"asia","flag":"\ud83c\udde7\ud83c\udded"},"50":{"id":"50","name":"Bangladesh","iso2":"BD","iso3":"BGD","continent":"asia","flag":"\ud83c\udde7\ud83c\udde9"},"52":{"id":"52","name":"Barbados","iso2":"BB","iso3":"BRB","continent":"south_america","flag":"\ud83c\udde7\ud83c\udde7"},"112":{"id":"112","name":"Belarus","iso2":"BY","iso3":"BLR","continent":"europe","flag":"\ud83c\udde7\ud83c\uddfe"},"56":{"id":"56","name":"Belgium","iso2":"BE","iso3":"BEL","continent":"europe","flag":"\ud83c\udde7\ud83c\uddea"},"84":{"id":"84","name":"Belize","iso2":"BZ","iso3":"BLZ","continent":"south_america","flag":"\ud83c\udde7\ud83c\uddff"},"204":{"id":"204","name":"Benin","iso2":"BJ","iso3":"BEN","continent":"africa","flag":"\ud83c\udde7\ud83c\uddef"},"60":{"id":"60","name":"Bermuda","iso2":"BM","iso3":"BMU","continent":"north_america","flag":"\ud83c\udde7\ud83c\uddf2"},"64":{"id":"64","name":"Bhutan","iso2":"BT","iso3":"BTN","continent":"asia","flag":"\ud83c\udde7\ud83c\uddf9"},"68":{"id":"68","name":"Bolivia, Plurinational State of","iso2":"BO","iso3":"BOL","continent":"south_america","flag":"\ud83c\udde7\ud83c\uddf4"},"535":{"id":"535","name":"Bonaire, Sint Eustatius and Saba","iso2":"BQ","iso3":"BES","continent":"south_america","flag":"\ud83c\udde7\ud83c\uddf6"},"70":{"id":"70","name":"Bosnia and Herzegovina","iso2":"BA","iso3":"BIH","continent":"europe","flag":"\ud83c\udde7\ud83c\udde6"},"72":{"id":"72","name":"Botswana","iso2":"BW","iso3":"BWA","continent":"africa","flag":"\ud83c\udde7\ud83c\uddfc"},"74":{"id":"74","name":"Bouvet Island","iso2":"BV","iso3":"BVT","continent":"south_america","flag":"\ud83c\udde7\ud83c\uddfb"},"76":{"id":"76","name":"Brazil","iso2":"BR","iso3":"BRA","continent":"south_america","flag":"\ud83c\udde7\ud83c\uddf7"},"86":{"id":"86","name":"British Indian Ocean Territory","iso2":"IO","iso3":"IOT","continent":"africa","flag":"\ud83c\uddee\ud83c\uddf4"},"96":{"id":"96","name":"Brunei Darussalam","iso2":"BN","iso3":"BRN","continent":"asia","flag":"\ud83c\udde7\ud83c\uddf3"},"100":{"id":"100","name":"Bulgaria","iso2":"BG","iso3":"BGR","continent":"europe","flag":"\ud83c\udde7\ud83c\uddec"},"854":{"id":"854","name":"Burkina Faso","iso2":"BF","iso3":"BFA","continent":"africa","flag":"\ud83c\udde7\ud83c\uddeb"},"108":{"id":"108","name":"Burundi","iso2":"BI","iso3":"BDI","continent":"africa","flag":"\ud83c\udde7\ud83c\uddee"},"132":{"id":"132","name":"Cabo Verde","iso2":"CV","iso3":"CPV","continent":"africa","flag":"\ud83c\udde8\ud83c\uddfb"},"116":{"id":"116","name":"Cambodia","iso2":"KH","iso3":"KHM","continent":"asia","flag":"\ud83c\uddf0\ud83c\udded"},"120":{"id":"120","name":"Cameroon","iso2":"CM","iso3":"CMR","continent":"africa","flag":"\ud83c\udde8\ud83c\uddf2"},"124":{"id":"124","name":"Canada","iso2":"CA","iso3":"CAN","continent":"north_america","flag":"\ud83c\udde8\ud83c\udde6"},"136":{"id":"136","name":"Cayman Islands","iso2":"KY","iso3":"CYM","continent":"south_america","flag":"\ud83c\uddf0\ud83c\uddfe"},"140":{"id":"140","name":"Central African Republic","iso2":"CF","iso3":"CAF","continent":"africa","flag":"\ud83c\udde8\ud83c\uddeb"},"148":{"id":"148","name":"Chad","iso2":"TD","iso3":"TCD","continent":"africa","flag":"\ud83c\uddf9\ud83c\udde9"},"152":{"id":"152","name":"Chile","iso2":"CL","iso3":"CHL","continent":"south_america","flag":"\ud83c\udde8\ud83c\uddf1"},"156":{"id":"156","name":"China","iso2":"CN","iso3":"CHN","continent":"asia","flag":"\ud83c\udde8\ud83c\uddf3"},"162":{"id":"162","name":"Christmas Island","iso2":"CX","iso3":"CXR","continent":"oceania","flag":"\ud83c\udde8\ud83c\uddfd"},"166":{"id":"166","name":"Cocos (Keeling) Islands","iso2":"CC","iso3":"CCK","continent":"oceania","flag":"\ud83c\udde8\ud83c\udde8"},"170":{"id":"170","name":"Colombia","iso2":"CO","iso3":"COL","continent":"south_america","flag":"\ud83c\udde8\ud83c\uddf4"},"174":{"id":"174","name":"Comoros","iso2":"KM","iso3":"COM","continent":"africa","flag":"\ud83c\uddf0\ud83c\uddf2"},"178":{"id":"178","name":"Congo","iso2":"CG","iso3":"COG","continent":"africa","flag":"\ud83c\udde8\ud83c\uddec"},"180":{"id":"180","name":"Congo, Democratic Republic of the","iso2":"CD","iso3":"COD","continent":"africa","flag":"\ud83c\udde8\ud83c\udde9"},"184":{"id":"184","name":"Cook Islands","iso2":"CK","iso3":"COK","continent":"oceania","flag":"\ud83c\udde8\ud83c\uddf0"},"188":{"id":"188","name":"Costa Rica","iso2":"CR","iso3":"CRI","continent":"south_america","flag":"\ud83c\udde8\ud83c\uddf7"},"384":{"id":"384","name":"C\u00f4te d'Ivoire","iso2":"CI","iso3":"CIV","continent":"africa","flag":"\ud83c\udde8\ud83c\uddee"},"191":{"id":"191","name":"Croatia","iso2":"HR","iso3":"HRV","continent":"europe","flag":"\ud83c\udded\ud83c\uddf7"},"192":{"id":"192","name":"Cuba","iso2":"CU","iso3":"CUB","continent":"south_america","flag":"\ud83c\udde8\ud83c\uddfa"},"531":{"id":"531","name":"Cura\u00e7ao","iso2":"CW","iso3":"CUW","continent":"south_america","flag":"\ud83c\udde8\ud83c\uddfc"},"196":{"id":"196","name":"Cyprus","iso2":"CY","iso3":"CYP","continent":"asia","flag":"\ud83c\udde8\ud83c\uddfe"},"203":{"id":"203","name":"Czechia","iso2":"CZ","iso3":"CZE","continent":"europe","flag":"\ud83c\udde8\ud83c\uddff"},"208":{"id":"208","name":"Denmark","iso2":"DK","iso3":"DNK","continent":"europe","flag":"\ud83c\udde9\ud83c\uddf0"},"262":{"id":"262","name":"Djibouti","iso2":"DJ","iso3":"DJI","continent":"africa","flag":"\ud83c\udde9\ud83c\uddef"},"212":{"id":"212","name":"Dominica","iso2":"DM","iso3":"DMA","continent":"south_america","flag":"\ud83c\udde9\ud83c\uddf2"},"214":{"id":"214","name":"Dominican Republic","iso2":"DO","iso3":"DOM","continent":"south_america","flag":"\ud83c\udde9\ud83c\uddf4"},"218":{"id":"218","name":"Ecuador","iso2":"EC","iso3":"ECU","continent":"south_america","flag":"\ud83c\uddea\ud83c\udde8"},"818":{"id":"818","name":"Egypt","iso2":"EG","iso3":"EGY","continent":"africa","flag":"\ud83c\uddea\ud83c\uddec"},"222":{"id":"222","name":"El Salvador","iso2":"SV","iso3":"SLV","continent":"south_america","flag":"\ud83c\uddf8\ud83c\uddfb"},"226":{"id":"226","name":"Equatorial Guinea","iso2":"GQ","iso3":"GNQ","continent":"africa","flag":"\ud83c\uddec\ud83c\uddf6"},"232":{"id":"232","name":"Eritrea","iso2":"ER","iso3":"ERI","continent":"africa","flag":"\ud83c\uddea\ud83c\uddf7"},"233":{"id":"233","name":"Estonia","iso2":"EE","iso3":"EST","continent":"europe","flag":"\ud83c\uddea\ud83c\uddea"},"748":{"id":"748","name":"Eswatini","iso2":"SZ","iso3":"SWZ","continent":"africa","flag":"\ud83c\uddf8\ud83c\uddff"},"231":{"id":"231","name":"Ethiopia","iso2":"ET","iso3":"ETH","continent":"africa","flag":"\ud83c\uddea\ud83c\uddf9"},"238":{"id":"238","name":"Falkland Islands (Malvinas)","iso2":"FK","iso3":"FLK","continent":"south_america","flag":"\ud83c\uddeb\ud83c\uddf0"},"234":{"id":"234","name":"Faroe Islands","iso2":"FO","iso3":"FRO","continent":"europe","flag":"\ud83c\uddeb\ud83c\uddf4"},"242":{"id":"242","name":"Fiji","iso2":"FJ","iso3":"FJI","continent":"oceania","flag":"\ud83c\uddeb\ud83c\uddef"},"246":{"id":"246","name":"Finland","iso2":"FI","iso3":"FIN","continent":"europe","flag":"\ud83c\uddeb\ud83c\uddee"},"250":{"id":"250","name":"France","iso2":"FR","iso3":"FRA","continent":"europe","flag":"\ud83c\uddeb\ud83c\uddf7"},"254":{"id":"254","name":"French Guiana","iso2":"GF","iso3":"GUF","continent":"south_america","flag":"\ud83c\uddec\ud83c\uddeb"},"258":{"id":"258","name":"French Polynesia","iso2":"PF","iso3":"PYF","continent":"oceania","flag":"\ud83c\uddf5\ud83c\uddeb"},"260":{"id":"260","name":"French Southern Territories","iso2":"TF","iso3":"ATF","continent":"africa","flag":"\ud83c\uddf9\ud83c\uddeb"},"266":{"id":"266","name":"Gabon","iso2":"GA","iso3":"GAB","continent":"africa","flag":"\ud83c\uddec\ud83c\udde6"},"270":{"id":"270","name":"Gambia","iso2":"GM","iso3":"GMB","continent":"africa","flag":"\ud83c\uddec\ud83c\uddf2"},"268":{"id":"268","name":"Georgia","iso2":"GE","iso3":"GEO","continent":"asia","flag":"\ud83c\uddec\ud83c\uddea"},"276":{"id":"276","name":"Germany","iso2":"DE","iso3":"DEU","continent":"europe","flag":"\ud83c\udde9\ud83c\uddea"},"288":{"id":"288","name":"Ghana","iso2":"GH","iso3":"GHA","continent":"africa","flag":"\ud83c\uddec\ud83c\udded"},"292":{"id":"292","name":"Gibraltar","iso2":"GI","iso3":"GIB","continent":"europe","flag":"\ud83c\uddec\ud83c\uddee"},"300":{"id":"300","name":"Greece","iso2":"GR","iso3":"GRC","continent":"europe","flag":"\ud83c\uddec\ud83c\uddf7"},"304":{"id":"304","name":"Greenland","iso2":"GL","iso3":"GRL","continent":"north_america","flag":"\ud83c\uddec\ud83c\uddf1"},"308":{"id":"308","name":"Grenada","iso2":"GD","iso3":"GRD","continent":"south_america","flag":"\ud83c\uddec\ud83c\udde9"},"312":{"id":"312","name":"Guadeloupe","iso2":"GP","iso3":"GLP","continent":"south_america","flag":"\ud83c\uddec\ud83c\uddf5"},"316":{"id":"316","name":"Guam","iso2":"GU","iso3":"GUM","continent":"oceania","flag":"\ud83c\uddec\ud83c\uddfa"},"320":{"id":"320","name":"Guatemala","iso2":"GT","iso3":"GTM","continent":"south_america","flag":"\ud83c\uddec\ud83c\uddf9"},"831":{"id":"831","name":"Guernsey","iso2":"GG","iso3":"GGY","continent":"europe","flag":"\ud83c\uddec\ud83c\uddec"},"324":{"id":"324","name":"Guinea","iso2":"GN","iso3":"GIN","continent":"africa","flag":"\ud83c\uddec\ud83c\uddf3"},"624":{"id":"624","name":"Guinea-Bissau","iso2":"GW","iso3":"GNB","continent":"africa","flag":"\ud83c\uddec\ud83c\uddfc"},"328":{"id":"328","name":"Guyana","iso2":"GY","iso3":"GUY","continent":"south_america","flag":"\ud83c\uddec\ud83c\uddfe"},"332":{"id":"332","name":"Haiti","iso2":"HT","iso3":"HTI","continent":"south_america","flag":"\ud83c\udded\ud83c\uddf9"},"334":{"id":"334","name":"Heard Island and McDonald Islands","iso2":"HM","iso3":"HMD","continent":"oceania","flag":"\ud83c\udded\ud83c\uddf2"},"336":{"id":"336","name":"Holy See","iso2":"VA","iso3":"VAT","continent":"europe","flag":"\ud83c\uddfb\ud83c\udde6"},"340":{"id":"340","name":"Honduras","iso2":"HN","iso3":"HND","continent":"south_america","flag":"\ud83c\udded\ud83c\uddf3"},"344":{"id":"344","name":"Hong Kong","iso2":"HK","iso3":"HKG","continent":"asia","flag":"\ud83c\udded\ud83c\uddf0"},"348":{"id":"348","name":"Hungary","iso2":"HU","iso3":"HUN","continent":"europe","flag":"\ud83c\udded\ud83c\uddfa"},"352":{"id":"352","name":"Iceland","iso2":"IS","iso3":"ISL","continent":"europe","flag":"\ud83c\uddee\ud83c\uddf8"},"356":{"id":"356","name":"India","iso2":"IN","iso3":"IND","continent":"asia","flag":"\ud83c\uddee\ud83c\uddf3"},"360":{"id":"360","name":"Indonesia","iso2":"ID","iso3":"IDN","continent":"asia","flag":"\ud83c\uddee\ud83c\udde9"},"364":{"id":"364","name":"Iran, Islamic Republic of","iso2":"IR","iso3":"IRN","continent":"asia","flag":"\ud83c\uddee\ud83c\uddf7"},"368":{"id":"368","name":"Iraq","iso2":"IQ","iso3":"IRQ","continent":"asia","flag":"\ud83c\uddee\ud83c\uddf6"},"372":{"id":"372","name":"Ireland","iso2":"IE","iso3":"IRL","continent":"europe","flag":"\ud83c\uddee\ud83c\uddea"},"833":{"id":"833","name":"Isle of Man","iso2":"IM","iso3":"IMN","continent":"europe","flag":"\ud83c\uddee\ud83c\uddf2"},"376":{"id":"376","name":"Israel","iso2":"IL","iso3":"ISR","continent":"asia","flag":"\ud83c\uddee\ud83c\uddf1"},"380":{"id":"380","name":"Italy","iso2":"IT","iso3":"ITA","continent":"europe","flag":"\ud83c\uddee\ud83c\uddf9"},"388":{"id":"388","name":"Jamaica","iso2":"JM","iso3":"JAM","continent":"south_america","flag":"\ud83c\uddef\ud83c\uddf2"},"392":{"id":"392","name":"Japan","iso2":"JP","iso3":"JPN","continent":"asia","flag":"\ud83c\uddef\ud83c\uddf5"},"832":{"id":"832","name":"Jersey","iso2":"JE","iso3":"JEY","continent":"europe","flag":"\ud83c\uddef\ud83c\uddea"},"400":{"id":"400","name":"Jordan","iso2":"JO","iso3":"JOR","continent":"asia","flag":"\ud83c\uddef\ud83c\uddf4"},"398":{"id":"398","name":"Kazakhstan","iso2":"KZ","iso3":"KAZ","continent":"asia","flag":"\ud83c\uddf0\ud83c\uddff"},"404":{"id":"404","name":"Kenya","iso2":"KE","iso3":"KEN","continent":"africa","flag":"\ud83c\uddf0\ud83c\uddea"},"296":{"id":"296","name":"Kiribati","iso2":"KI","iso3":"KIR","continent":"oceania","flag":"\ud83c\uddf0\ud83c\uddee"},"408":{"id":"408","name":"Korea, Democratic People's Republic of","iso2":"KP","iso3":"PRK","continent":"asia","flag":"\ud83c\uddf0\ud83c\uddf5"},"410":{"id":"410","name":"Korea, Republic of","iso2":"KR","iso3":"KOR","continent":"asia","flag":"\ud83c\uddf0\ud83c\uddf7"},"414":{"id":"414","name":"Kuwait","iso2":"KW","iso3":"KWT","continent":"asia","flag":"\ud83c\uddf0\ud83c\uddfc"},"417":{"id":"417","name":"Kyrgyzstan","iso2":"KG","iso3":"KGZ","continent":"asia","flag":"\ud83c\uddf0\ud83c\uddec"},"418":{"id":"418","name":"Lao People's Democratic Republic","iso2":"LA","iso3":"LAO","continent":"asia","flag":"\ud83c\uddf1\ud83c\udde6"},"428":{"id":"428","name":"Latvia","iso2":"LV","iso3":"LVA","continent":"europe","flag":"\ud83c\uddf1\ud83c\uddfb"},"422":{"id":"422","name":"Lebanon","iso2":"LB","iso3":"LBN","continent":"asia","flag":"\ud83c\uddf1\ud83c\udde7"},"426":{"id":"426","name":"Lesotho","iso2":"LS","iso3":"LSO","continent":"africa","flag":"\ud83c\uddf1\ud83c\uddf8"},"430":{"id":"430","name":"Liberia","iso2":"LR","iso3":"LBR","continent":"africa","flag":"\ud83c\uddf1\ud83c\uddf7"},"434":{"id":"434","name":"Libya","iso2":"LY","iso3":"LBY","continent":"africa","flag":"\ud83c\uddf1\ud83c\uddfe"},"438":{"id":"438","name":"Liechtenstein","iso2":"LI","iso3":"LIE","continent":"europe","flag":"\ud83c\uddf1\ud83c\uddee"},"440":{"id":"440","name":"Lithuania","iso2":"LT","iso3":"LTU","continent":"europe","flag":"\ud83c\uddf1\ud83c\uddf9"},"442":{"id":"442","name":"Luxembourg","iso2":"LU","iso3":"LUX","continent":"europe","flag":"\ud83c\uddf1\ud83c\uddfa"},"446":{"id":"446","name":"Macao","iso2":"MO","iso3":"MAC","continent":"asia","flag":"\ud83c\uddf2\ud83c\uddf4"},"450":{"id":"450","name":"Madagascar","iso2":"MG","iso3":"MDG","continent":"africa","flag":"\ud83c\uddf2\ud83c\uddec"},"454":{"id":"454","name":"Malawi","iso2":"MW","iso3":"MWI","continent":"africa","flag":"\ud83c\uddf2\ud83c\uddfc"},"458":{"id":"458","name":"Malaysia","iso2":"MY","iso3":"MYS","continent":"asia","flag":"\ud83c\uddf2\ud83c\uddfe"},"462":{"id":"462","name":"Maldives","iso2":"MV","iso3":"MDV","continent":"asia","flag":"\ud83c\uddf2\ud83c\uddfb"},"466":{"id":"466","name":"Mali","iso2":"ML","iso3":"MLI","continent":"africa","flag":"\ud83c\uddf2\ud83c\uddf1"},"470":{"id":"470","name":"Malta","iso2":"MT","iso3":"MLT","continent":"europe","flag":"\ud83c\uddf2\ud83c\uddf9"},"584":{"id":"584","name":"Marshall Islands","iso2":"MH","iso3":"MHL","continent":"oceania","flag":"\ud83c\uddf2\ud83c\udded"},"474":{"id":"474","name":"Martinique","iso2":"MQ","iso3":"MTQ","continent":"south_america","flag":"\ud83c\uddf2\ud83c\uddf6"},"478":{"id":"478","name":"Mauritania","iso2":"MR","iso3":"MRT","continent":"africa","flag":"\ud83c\uddf2\ud83c\uddf7"},"480":{"id":"480","name":"Mauritius","iso2":"MU","iso3":"MUS","continent":"africa","flag":"\ud83c\uddf2\ud83c\uddfa"},"175":{"id":"175","name":"Mayotte","iso2":"YT","iso3":"MYT","continent":"africa","flag":"\ud83c\uddfe\ud83c\uddf9"},"484":{"id":"484","name":"Mexico","iso2":"MX","iso3":"MEX","continent":"south_america","flag":"\ud83c\uddf2\ud83c\uddfd"},"583":{"id":"583","name":"Micronesia, Federated States of","iso2":"FM","iso3":"FSM","continent":"oceania","flag":"\ud83c\uddeb\ud83c\uddf2"},"498":{"id":"498","name":"Moldova, Republic of","iso2":"MD","iso3":"MDA","continent":"europe","flag":"\ud83c\uddf2\ud83c\udde9"},"492":{"id":"492","name":"Monaco","iso2":"MC","iso3":"MCO","continent":"europe","flag":"\ud83c\uddf2\ud83c\udde8"},"496":{"id":"496","name":"Mongolia","iso2":"MN","iso3":"MNG","continent":"asia","flag":"\ud83c\uddf2\ud83c\uddf3"},"499":{"id":"499","name":"Montenegro","iso2":"ME","iso3":"MNE","continent":"europe","flag":"\ud83c\uddf2\ud83c\uddea"},"500":{"id":"500","name":"Montserrat","iso2":"MS","iso3":"MSR","continent":"south_america","flag":"\ud83c\uddf2\ud83c\uddf8"},"504":{"id":"504","name":"Morocco","iso2":"MA","iso3":"MAR","continent":"africa","flag":"\ud83c\uddf2\ud83c\udde6"},"508":{"id":"508","name":"Mozambique","iso2":"MZ","iso3":"MOZ","continent":"africa","flag":"\ud83c\uddf2\ud83c\uddff"},"104":{"id":"104","name":"Myanmar","iso2":"MM","iso3":"MMR","continent":"asia","flag":"\ud83c\uddf2\ud83c\uddf2"},"516":{"id":"516","name":"Namibia","iso2":"NA","iso3":"NAM","continent":"africa","flag":"\ud83c\uddf3\ud83c\udde6"},"520":{"id":"520","name":"Nauru","iso2":"NR","iso3":"NRU","continent":"oceania","flag":"\ud83c\uddf3\ud83c\uddf7"},"524":{"id":"524","name":"Nepal","iso2":"NP","iso3":"NPL","continent":"asia","flag":"\ud83c\uddf3\ud83c\uddf5"},"528":{"id":"528","name":"Netherlands, Kingdom of the","iso2":"NL","iso3":"NLD","continent":"europe","flag":"\ud83c\uddf3\ud83c\uddf1"},"540":{"id":"540","name":"New Caledonia","iso2":"NC","iso3":"NCL","continent":"oceania","flag":"\ud83c\uddf3\ud83c\udde8"},"554":{"id":"554","name":"New Zealand","iso2":"NZ","iso3":"NZL","continent":"oceania","flag":"\ud83c\uddf3\ud83c\uddff"},"558":{"id":"558","name":"Nicaragua","iso2":"NI","iso3":"NIC","continent":"south_america","flag":"\ud83c\uddf3\ud83c\uddee"},"562":{"id":"562","name":"Niger","iso2":"NE","iso3":"NER","continent":"africa","flag":"\ud83c\uddf3\ud83c\uddea"},"566":{"id":"566","name":"Nigeria","iso2":"NG","iso3":"NGA","continent":"africa","flag":"\ud83c\uddf3\ud83c\uddec"},"570":{"id":"570","name":"Niue","iso2":"NU","iso3":"NIU","continent":"oceania","flag":"\ud83c\uddf3\ud83c\uddfa"},"574":{"id":"574","name":"Norfolk Island","iso2":"NF","iso3":"NFK","continent":"oceania","flag":"\ud83c\uddf3\ud83c\uddeb"},"807":{"id":"807","name":"North Macedonia","iso2":"MK","iso3":"MKD","continent":"europe","flag":"\ud83c\uddf2\ud83c\uddf0"},"580":{"id":"580","name":"Northern Mariana Islands","iso2":"MP","iso3":"MNP","continent":"oceania","flag":"\ud83c\uddf2\ud83c\uddf5"},"578":{"id":"578","name":"Norway","iso2":"NO","iso3":"NOR","continent":"europe","flag":"\ud83c\uddf3\ud83c\uddf4"},"512":{"id":"512","name":"Oman","iso2":"OM","iso3":"OMN","continent":"asia","flag":"\ud83c\uddf4\ud83c\uddf2"},"586":{"id":"586","name":"Pakistan","iso2":"PK","iso3":"PAK","continent":"asia","flag":"\ud83c\uddf5\ud83c\uddf0"},"585":{"id":"585","name":"Palau","iso2":"PW","iso3":"PLW","continent":"oceania","flag":"\ud83c\uddf5\ud83c\uddfc"},"275":{"id":"275","name":"Palestine, State of","iso2":"PS","iso3":"PSE","continent":"asia","flag":"\ud83c\uddf5\ud83c\uddf8"},"591":{"id":"591","name":"Panama","iso2":"PA","iso3":"PAN","continent":"south_america","flag":"\ud83c\uddf5\ud83c\udde6"},"598":{"id":"598","name":"Papua New Guinea","iso2":"PG","iso3":"PNG","continent":"oceania","flag":"\ud83c\uddf5\ud83c\uddec"},"600":{"id":"600","name":"Paraguay","iso2":"PY","iso3":"PRY","continent":"south_america","flag":"\ud83c\uddf5\ud83c\uddfe"},"604":{"id":"604","name":"Peru","iso2":"PE","iso3":"PER","continent":"south_america","flag":"\ud83c\uddf5\ud83c\uddea"},"608":{"id":"608","name":"Philippines","iso2":"PH","iso3":"PHL","continent":"asia","flag":"\ud83c\uddf5\ud83c\udded"},"612":{"id":"612","name":"Pitcairn","iso2":"PN","iso3":"PCN","continent":"oceania","flag":"\ud83c\uddf5\ud83c\uddf3"},"616":{"id":"616","name":"Poland","iso2":"PL","iso3":"POL","continent":"europe","flag":"\ud83c\uddf5\ud83c\uddf1"},"620":{"id":"620","name":"Portugal","iso2":"PT","iso3":"PRT","continent":"europe","flag":"\ud83c\uddf5\ud83c\uddf9"},"630":{"id":"630","name":"Puerto Rico","iso2":"PR","iso3":"PRI","continent":"south_america","flag":"\ud83c\uddf5\ud83c\uddf7"},"634":{"id":"634","name":"Qatar","iso2":"QA","iso3":"QAT","continent":"asia","flag":"\ud83c\uddf6\ud83c\udde6"},"638":{"id":"638","name":"R\u00e9union","iso2":"RE","iso3":"REU","continent":"africa","flag":"\ud83c\uddf7\ud83c\uddea"},"642":{"id":"642","name":"Romania","iso2":"RO","iso3":"ROU","continent":"europe","flag":"\ud83c\uddf7\ud83c\uddf4"},"643":{"id":"643","name":"Russian Federation","iso2":"RU","iso3":"RUS","continent":"europe","flag":"\ud83c\uddf7\ud83c\uddfa"},"646":{"id":"646","name":"Rwanda","iso2":"RW","iso3":"RWA","continent":"africa","flag":"\ud83c\uddf7\ud83c\uddfc"},"652":{"id":"652","name":"Saint Barth\u00e9lemy","iso2":"BL","iso3":"BLM","continent":"south_america","flag":"\ud83c\udde7\ud83c\uddf1"},"654":{"id":"654","name":"Saint Helena, Ascension and Tristan da Cunha","iso2":"SH","iso3":"SHN","continent":"africa","flag":"\ud83c\uddf8\ud83c\udded"},"659":{"id":"659","name":"Saint Kitts and Nevis","iso2":"KN","iso3":"KNA","continent":"south_america","flag":"\ud83c\uddf0\ud83c\uddf3"},"662":{"id":"662","name":"Saint Lucia","iso2":"LC","iso3":"LCA","continent":"south_america","flag":"\ud83c\uddf1\ud83c\udde8"},"663":{"id":"663","name":"Saint Martin (French part)","iso2":"MF","iso3":"MAF","continent":"south_america","flag":"\ud83c\uddf2\ud83c\uddeb"},"666":{"id":"666","name":"Saint Pierre and Miquelon","iso2":"PM","iso3":"SPM","continent":"north_america","flag":"\ud83c\uddf5\ud83c\uddf2"},"670":{"id":"670","name":"Saint Vincent and the Grenadines","iso2":"VC","iso3":"VCT","continent":"south_america","flag":"\ud83c\uddfb\ud83c\udde8"},"882":{"id":"882","name":"Samoa","iso2":"WS","iso3":"WSM","continent":"oceania","flag":"\ud83c\uddfc\ud83c\uddf8"},"674":{"id":"674","name":"San Marino","iso2":"SM","iso3":"SMR","continent":"europe","flag":"\ud83c\uddf8\ud83c\uddf2"},"678":{"id":"678","name":"Sao Tome and Principe","iso2":"ST","iso3":"STP","continent":"africa","flag":"\ud83c\uddf8\ud83c\uddf9"},"682":{"id":"682","name":"Saudi Arabia","iso2":"SA","iso3":"SAU","continent":"asia","flag":"\ud83c\uddf8\ud83c\udde6"},"686":{"id":"686","name":"Senegal","iso2":"SN","iso3":"SEN","continent":"africa","flag":"\ud83c\uddf8\ud83c\uddf3"},"688":{"id":"688","name":"Serbia","iso2":"RS","iso3":"SRB","continent":"europe","flag":"\ud83c\uddf7\ud83c\uddf8"},"690":{"id":"690","name":"Seychelles","iso2":"SC","iso3":"SYC","continent":"africa","flag":"\ud83c\uddf8\ud83c\udde8"},"694":{"id":"694","name":"Sierra Leone","iso2":"SL","iso3":"SLE","continent":"africa","flag":"\ud83c\uddf8\ud83c\uddf1"},"702":{"id":"702","name":"Singapore","iso2":"SG","iso3":"SGP","continent":"asia","flag":"\ud83c\uddf8\ud83c\uddec"},"534":{"id":"534","name":"Sint Maarten (Dutch part)","iso2":"SX","iso3":"SXM","continent":"south_america","flag":"\ud83c\uddf8\ud83c\uddfd"},"703":{"id":"703","name":"Slovakia","iso2":"SK","iso3":"SVK","continent":"europe","flag":"\ud83c\uddf8\ud83c\uddf0"},"705":{"id":"705","name":"Slovenia","iso2":"SI","iso3":"SVN","continent":"europe","flag":"\ud83c\uddf8\ud83c\uddee"},"90":{"id":"90","name":"Solomon Islands","iso2":"SB","iso3":"SLB","continent":"oceania","flag":"\ud83c\uddf8\ud83c\udde7"},"706":{"id":"706","name":"Somalia","iso2":"SO","iso3":"SOM","continent":"africa","flag":"\ud83c\uddf8\ud83c\uddf4"},"710":{"id":"710","name":"South Africa","iso2":"ZA","iso3":"ZAF","continent":"africa","flag":"\ud83c\uddff\ud83c\udde6"},"239":{"id":"239","name":"South Georgia and the South Sandwich Islands","iso2":"GS","iso3":"SGS","continent":"south_america","flag":"\ud83c\uddec\ud83c\uddf8"},"728":{"id":"728","name":"South Sudan","iso2":"SS","iso3":"SSD","continent":"africa","flag":"\ud83c\uddf8\ud83c\uddf8"},"724":{"id":"724","name":"Spain","iso2":"ES","iso3":"ESP","continent":"europe","flag":"\ud83c\uddea\ud83c\uddf8"},"144":{"id":"144","name":"Sri Lanka","iso2":"LK","iso3":"LKA","continent":"asia","flag":"\ud83c\uddf1\ud83c\uddf0"},"729":{"id":"729","name":"Sudan","iso2":"SD","iso3":"SDN","continent":"africa","flag":"\ud83c\uddf8\ud83c\udde9"},"740":{"id":"740","name":"Suriname","iso2":"SR","iso3":"SUR","continent":"south_america","flag":"\ud83c\uddf8\ud83c\uddf7"},"744":{"id":"744","name":"Svalbard and Jan Mayen","iso2":"SJ","iso3":"SJM","continent":"europe","flag":"\ud83c\uddf8\ud83c\uddef"},"752":{"id":"752","name":"Sweden","iso2":"SE","iso3":"SWE","continent":"europe","flag":"\ud83c\uddf8\ud83c\uddea"},"756":{"id":"756","name":"Switzerland","iso2":"CH","iso3":"CHE","continent":"europe","flag":"\ud83c\udde8\ud83c\udded"},"760":{"id":"760","name":"Syrian Arab Republic","iso2":"SY","iso3":"SYR","continent":"asia","flag":"\ud83c\uddf8\ud83c\uddfe"},"158":{"id":"158","name":"Taiwan, Province of China","iso2":"TW","iso3":"TWN","continent":"other","flag":"\ud83c\uddf9\ud83c\uddfc"},"762":{"id":"762","name":"Tajikistan","iso2":"TJ","iso3":"TJK","continent":"asia","flag":"\ud83c\uddf9\ud83c\uddef"},"834":{"id":"834","name":"Tanzania, United Republic of","iso2":"TZ","iso3":"TZA","continent":"africa","flag":"\ud83c\uddf9\ud83c\uddff"},"764":{"id":"764","name":"Thailand","iso2":"TH","iso3":"THA","continent":"asia","flag":"\ud83c\uddf9\ud83c\udded"},"626":{"id":"626","name":"Timor-Leste","iso2":"TL","iso3":"TLS","continent":"asia","flag":"\ud83c\uddf9\ud83c\uddf1"},"768":{"id":"768","name":"Togo","iso2":"TG","iso3":"TGO","continent":"africa","flag":"\ud83c\uddf9\ud83c\uddec"},"772":{"id":"772","name":"Tokelau","iso2":"TK","iso3":"TKL","continent":"oceania","flag":"\ud83c\uddf9\ud83c\uddf0"},"776":{"id":"776","name":"Tonga","iso2":"TO","iso3":"TON","continent":"oceania","flag":"\ud83c\uddf9\ud83c\uddf4"},"780":{"id":"780","name":"Trinidad and Tobago","iso2":"TT","iso3":"TTO","continent":"south_america","flag":"\ud83c\uddf9\ud83c\uddf9"},"788":{"id":"788","name":"Tunisia","iso2":"TN","iso3":"TUN","continent":"africa","flag":"\ud83c\uddf9\ud83c\uddf3"},"792":{"id":"792","name":"T\u00fcrkiye","iso2":"TR","iso3":"TUR","continent":"asia","flag":"\ud83c\uddf9\ud83c\uddf7"},"795":{"id":"795","name":"Turkmenistan","iso2":"TM","iso3":"TKM","continent":"asia","flag":"\ud83c\uddf9\ud83c\uddf2"},"796":{"id":"796","name":"Turks and Caicos Islands","iso2":"TC","iso3":"TCA","continent":"south_america","flag":"\ud83c\uddf9\ud83c\udde8"},"798":{"id":"798","name":"Tuvalu","iso2":"TV","iso3":"TUV","continent":"oceania","flag":"\ud83c\uddf9\ud83c\uddfb"},"800":{"id":"800","name":"Uganda","iso2":"UG","iso3":"UGA","continent":"africa","flag":"\ud83c\uddfa\ud83c\uddec"},"804":{"id":"804","name":"Ukraine","iso2":"UA","iso3":"UKR","continent":"europe","flag":"\ud83c\uddfa\ud83c\udde6"},"784":{"id":"784","name":"United Arab Emirates","iso2":"AE","iso3":"ARE","continent":"asia","flag":"\ud83c\udde6\ud83c\uddea"},"826":{"id":"826","name":"United Kingdom of Great Britain and Northern Ireland","iso2":"GB","iso3":"GBR","continent":"europe","flag":"\ud83c\uddec\ud83c\udde7"},"840":{"id":"840","name":"United States of America","iso2":"US","iso3":"USA","continent":"north_america","flag":"\ud83c\uddfa\ud83c\uddf8"},"581":{"id":"581","name":"United States Minor Outlying Islands","iso2":"UM","iso3":"UMI","continent":"oceania","flag":"\ud83c\uddfa\ud83c\uddf2"},"858":{"id":"858","name":"Uruguay","iso2":"UY","iso3":"URY","continent":"south_america","flag":"\ud83c\uddfa\ud83c\uddfe"},"860":{"id":"860","name":"Uzbekistan","iso2":"UZ","iso3":"UZB","continent":"asia","flag":"\ud83c\uddfa\ud83c\uddff"},"548":{"id":"548","name":"Vanuatu","iso2":"VU","iso3":"VUT","continent":"oceania","flag":"\ud83c\uddfb\ud83c\uddfa"},"862":{"id":"862","name":"Venezuela, Bolivarian Republic of","iso2":"VE","iso3":"VEN","continent":"south_america","flag":"\ud83c\uddfb\ud83c\uddea"},"704":{"id":"704","name":"Viet Nam","iso2":"VN","iso3":"VNM","continent":"asia","flag":"\ud83c\uddfb\ud83c\uddf3"},"92":{"id":"92","name":"Virgin Islands (British)","iso2":"VG","iso3":"VGB","continent":"south_america","flag":"\ud83c\uddfb\ud83c\uddec"},"850":{"id":"850","name":"Virgin Islands (U.S.)","iso2":"VI","iso3":"VIR","continent":"south_america","flag":"\ud83c\uddfb\ud83c\uddee"},"876":{"id":"876","name":"Wallis and Futuna","iso2":"WF","iso3":"WLF","continent":"oceania","flag":"\ud83c\uddfc\ud83c\uddeb"},"732":{"id":"732","name":"Western Sahara","iso2":"EH","iso3":"ESH","continent":"africa","flag":"\ud83c\uddea\ud83c\udded"},"887":{"id":"887","name":"Yemen","iso2":"YE","iso3":"YEM","continent":"asia","flag":"\ud83c\uddfe\ud83c\uddea"},"894":{"id":"894","name":"Zambia","iso2":"ZM","iso3":"ZMB","continent":"africa","flag":"\ud83c\uddff\ud83c\uddf2"},"716":{"id":"716","name":"Zimbabwe","iso2":"ZW","iso3":"ZWE","continent":"africa","flag":"\ud83c\uddff\ud83c\uddfc"},"Kosovo":{"id":"Kosovo","name":"Kosovo","iso2":"XK","iso3":"XKX","continent":"europe","flag":"\ud83c\uddfd\ud83c\uddf0"},"N. Cyprus":{"id":"N. Cyprus","name":"Northern Cyprus","iso2":"CY","iso3":"CYP","continent":"europe","flag":"\ud83c\udde8\ud83c\uddfe"},"Somaliland":{"id":"Somaliland","name":"Somaliland","iso2":"SO","iso3":"SOM","continent":"africa","flag":"\ud83c\uddf8\ud83c\uddf4"}};

  // Build high-performance lookup indexes
  var NAME_TO_ID = {};
  var ISO2_TO_ID = {};
  var ISO3_TO_ID = {};
  var NUM_TO_ID = {};

  Object.keys(COUNTRY_METADATA).forEach(function (key) {
    var c = COUNTRY_METADATA[key];
    var id = String(c.id);
    NUM_TO_ID[id] = id;
    if (c.iso2) ISO2_TO_ID[c.iso2.toUpperCase()] = id;
    if (c.iso3) ISO3_TO_ID[c.iso3.toUpperCase()] = id;
    if (c.name) NAME_TO_ID[c.name.toLowerCase().trim()] = id;
  });

  // Common alternate country aliases and colloquial forms
  var ALIASES = {
    "usa": "840",
    "us": "840",
    "united states": "840",
    "united states of america": "840",
    "uk": "826",
    "great britain": "826",
    "britain": "826",
    "england": "826",
    "scotland": "826",
    "wales": "826",
    "united kingdom": "826",
    "korea": "410",
    "south korea": "410",
    "republic of korea": "410",
    "korea, republic of": "410",
    "north korea": "408",
    "russia": "643",
    "russian federation": "643",
    "vietnam": "704",
    "viet nam": "704",
    "czech republic": "203",
    "czechia": "203",
    "netherlands": "528",
    "the netherlands": "528",
    "holland": "528",
    "taiwan": "158",
    "taiwan, province of china": "158",
    "uae": "784",
    "united arab emirates": "784",
    "brasil": "076",
    "brazil": "076",
    "tanzania": "834",
    "tanzania, united republic of": "834",
    "bolivia": "068",
    "bolivia, plurinational state of": "068",
    "venezuela": "862",
    "venezuela, bolivarian republic of": "862",
    "iran": "364",
    "iran, islamic republic of": "364",
    "syria": "760",
    "syrian arab republic": "760",
    "laos": "418",
    "lao people's democratic republic": "418",
    "moldova": "498",
    "moldova, republic of": "498",
    "cote d'ivoire": "384",
    "ivory coast": "384",
    "congo": "178",
    "democratic republic of the congo": "180",
    "dr congo": "180",
    "drc": "180"
  };

  Object.keys(ALIASES).forEach(function (alias) {
    var normId = String(parseInt(ALIASES[alias], 10) || ALIASES[alias]);
    NAME_TO_ID[alias] = normId;
  });

  function resolveCountry(val) {
    if (val === null || val === undefined) return null;
    var str = String(val).trim();
    if (!str) return null;

    // Check direct numeric ISO code
    var intVal = parseInt(str, 10);
    if (!isNaN(intVal)) {
      var strInt = String(intVal);
      if (NUM_TO_ID[strInt]) return COUNTRY_METADATA[NUM_TO_ID[strInt]];
    }

    var upper = str.toUpperCase();
    if (ISO2_TO_ID[upper]) return COUNTRY_METADATA[ISO2_TO_ID[upper]];
    if (ISO3_TO_ID[upper]) return COUNTRY_METADATA[ISO3_TO_ID[upper]];

    var lower = str.toLowerCase();
    if (NAME_TO_ID[lower]) return COUNTRY_METADATA[NAME_TO_ID[lower]];

    // Clean punctuation and try again
    var cleaned = lower.replace(/[^a-z0-9 ]/g, "").replace(/ +/g, " ").trim();
    if (NAME_TO_ID[cleaned]) return COUNTRY_METADATA[NAME_TO_ID[cleaned]];

    return null;
  }

  // Color Theme Palettes
  var COLOR_THEMES = {
    "google_enterprise": {
      name: "Google Enterprise Blue",
      ramp: ["#e8f0fe", "#c2e7ff", "#7cacf8", "#4285f4", "#1a73e8", "#174ea6"],
      accent: "#1a73e8",
      bubble: "#ea4335"
    },
    "emerald_slate": {
      name: "Emerald & Teal",
      ramp: ["#e6f4ea", "#ceead6", "#81c995", "#34a853", "#1e8e3e", "#0d652d"],
      accent: "#1e8e3e",
      bubble: "#f2994a"
    },
    "sunset_amber": {
      name: "Sunset Amber & Coral",
      ramp: ["#fef7e0", "#feefc3", "#fdd663", "#fbbc04", "#e37400", "#b06000"],
      accent: "#e37400",
      bubble: "#4285f4"
    },
    "ocean_breeze": {
      name: "Ocean Breeze & Indigo",
      ramp: ["#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0284c7", "#0369a1"],
      accent: "#0284c7",
      bubble: "#f43f5e"
    },
    "crimson_slate": {
      name: "Crimson & Rose",
      ramp: ["#fce8e6", "#fad2cf", "#f28b82", "#ea4335", "#d93025", "#a50e0e"],
      accent: "#d93025",
      bubble: "#1a73e8"
    },
    "monochrome_slate": {
      name: "Monochrome Graphite",
      ramp: ["#f1f3f4", "#dadce0", "#bdc1c6", "#80868b", "#5f6368", "#202124"],
      accent: "#3c4043",
      bubble: "#1a73e8"
    }
  };

  // Continent Center & Scale Configurations for regional focus
  var CONTINENT_CONFIG = {
    "north_america": { center: [-100, 48], scaleMultiplier: 2.3 },
    "south_america": { center: [-60, -22], scaleMultiplier: 2.2 },
    "europe": { center: [15, 54], scaleMultiplier: 3.8 },
    "asia": { center: [95, 38], scaleMultiplier: 2.0 },
    "africa": { center: [20, 2], scaleMultiplier: 2.3 },
    "oceania": { center: [138, -25], scaleMultiplier: 2.8 }
  };

  var cachedWorldData = null;

  looker.plugins.visualizations.add({
    id: "world_choropleth_map",
    label: "Interactive World & Regional Choropleth Map",
    options: {
      // ==========================================
      // SECTION 1: DISPLAY (Functional & Layout)
      // ==========================================
      layoutMode: {
        type: "string",
        label: "Projection & Layout Mode",
        display: "select",
        values: [
          { "Natural Earth (Balanced Global)": "natural_earth" },
          { "3D Rotating Interactive Globe": "orthographic_globe" },
          { "Mercator (Standard Cylindrical)": "mercator" },
          { "Equal-Earth (True Equal Area)": "equal_earth" }
        ],
        default: "natural_earth",
        section: "Display",
        order: 1
      },
      continentFocus: {
        type: "string",
        label: "Continent / Regional Focus",
        display: "select",
        values: [
          { "Global (All Continents)": "all" },
          { "North America": "north_america" },
          { "Europe": "europe" },
          { "Asia": "asia" },
          { "South America": "south_america" },
          { "Africa": "africa" },
          { "Oceania": "oceania" }
        ],
        default: "all",
        section: "Display",
        order: 2
      },
      countryFieldOverride: {
        type: "string",
        label: "Country Dimension",
        display: "select",
        values: [{ "Auto (run query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 3
      },
      secondaryGroupOverride: {
        type: "string",
        label: "Secondary / Group Dimension",
        display: "select",
        values: [{ "Auto (run query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 4
      },
      measureFieldOverride: {
        type: "string",
        label: "Primary Metric Measure",
        display: "select",
        values: [{ "Auto (run query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 5
      },
      secondaryMeasureOverride: {
        type: "string",
        label: "Secondary Bubble Pin Measure",
        display: "select",
        values: [{ "Auto (run query to populate field choices)": "" }],
        default: "",
        section: "Display",
        order: 6
      },
      targetCalculationMode: {
        type: "string",
        label: "Benchmark / Target Mode",
        display: "select",
        values: [
          { "None (No Target Benchmark)": "none" },
          { "Secondary Measure Column": "second_measure" },
          { "Dataset Mean (Global Country Average)": "dataset_mean" },
          { "Dataset Median (Global Median)": "dataset_median" },
          { "Top Percentile P75 Target": "percentile_p75" },
          { "Top Percentile P90 Target": "percentile_p90" },
          { "Fixed Static Target Value": "fixed" }
        ],
        default: "dataset_mean",
        section: "Display",
        order: 7
      },
      fixedTargetValue: {
        type: "number",
        label: "Fixed Target / Quota Value (when Mode is Fixed)",
        default: 0,
        section: "Display",
        order: 8
      },
      referenceLineLabel: {
        type: "string",
        label: "Benchmark Reference Label",
        default: "Global Benchmark",
        section: "Display",
        order: 9
      },
      showReferenceLine: {
        type: "boolean",
        label: "Show Benchmark in HUD & Tooltips",
        default: true,
        section: "Display",
        order: 10
      },
      anomalyThresholdPct: {
        type: "number",
        label: "Anomaly Alert Threshold (+/- % vs Benchmark)",
        default: 30,
        section: "Display",
        order: 11
      },
      sortBy: {
        type: "string",
        label: "Sort Territories By",
        display: "select",
        values: [
          { "Metric Value Descending": "metric_desc" },
          { "Metric Value Ascending": "metric_asc" },
          { "Country Name (Alphabetical A-Z)": "country_asc" },
          { "Variance vs Benchmark Descending": "variance_desc" },
          { "Natural / Query Order": "natural" }
        ],
        default: "metric_desc",
        section: "Display",
        order: 12
      },
      topNLimit: {
        type: "number",
        label: "Top-N Territories Limit (0 = All Countries)",
        default: 0,
        section: "Display",
        order: 13
      },
      enableOtherRollup: {
        type: "boolean",
        label: "Rollup Non-Top-N into Other Summary",
        default: false,
        section: "Display",
        order: 14
      },
      suppressZeroNull: {
        type: "boolean",
        label: "Suppress Zero / Null Territories",
        default: false,
        section: "Display",
        order: 15
      },
      showBubbleOverlay: {
        type: "boolean",
        label: "Secondary Bubble Pin Overlay",
        default: true,
        section: "Display",
        order: 16
      },
      hudMode: {
        type: "string",
        label: "Executive Spatial KPI HUD Mode",
        display: "select",
        values: [
          { "Full Executive Scorecard": "scorecard" },
          { "Compact Metric Strip": "compact_strip" },
          { "Hidden": "none" }
        ],
        default: "scorecard",
        section: "Display",
        order: 17
      },
      labelDensity: {
        type: "string",
        label: "Country Map Data Labels",
        display: "select",
        values: [
          { "Top 10 Leaders Only": "leaders_only" },
          { "All Active Reporting Countries": "all" },
          { "Hidden / Tooltip Only": "hidden" }
        ],
        default: "leaders_only",
        section: "Display",
        order: 18
      },
      customTitle: {
        type: "string",
        label: "Custom Map Title Override",
        default: "",
        section: "Display",
        order: 19
      },
      customSubtitle: {
        type: "string",
        label: "Custom Subtitle / Description Override",
        default: "",
        section: "Display",
        order: 20
      },
      showSearch: {
        type: "boolean",
        label: "Real-Time Country Search Bar",
        default: true,
        section: "Display",
        order: 21
      },
      showLegend: {
        type: "boolean",
        label: "Show Gradient Legend Bar",
        default: true,
        section: "Display",
        order: 22
      },
      globeAutoRotate: {
        type: "boolean",
        label: "Auto-Rotate 3D Globe (Globe Mode Only)",
        default: false,
        section: "Display",
        order: 23
      },

      // ==========================================
      // SECTION 2: STYLE (Aesthetics & Palettes)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Color Theme Palette",
        display: "select",
        values: [
          { "Google Enterprise": "google_enterprise" },
          { "Modern Slate": "modern_slate" },
          { "Cyberpunk Dark": "cyberpunk_dark" },
          { "Emerald FinOps": "emerald_finops" },
          { "Sunset Media": "sunset_media" },
          { "Wellverse Healthcare": "wellverse_health" },
          { "Custom Hex Override": "custom_override" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
      },
      customPrimaryColor: {
        type: "string",
        label: "Custom Primary / High Value Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 2
      },
      customPositiveColor: {
        type: "string",
        label: "Custom Positive / Goal Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 3
      },
      customNegativeColor: {
        type: "string",
        label: "Custom Negative / Alert Hex",
        display: "color",
        default: "",
        section: "Style",
        order: 4
      },
      metricPolarity: {
        type: "string",
        label: "Metric Polarity (Goal Direction)",
        display: "select",
        values: [
          { "Higher is Better (Revenue, Adoption, Volume)": "higher_better" },
          { "Lower is Better (Latency, Churn, Risk, CO2)": "lower_better" }
        ],
        default: "higher_better",
        section: "Style",
        order: 5
      },
      fontScale: {
        type: "string",
        label: "Typography & Font Scale",
        display: "select",
        values: [
          { "Compact (Dense Grid)": "compact" },
          { "Standard (Balanced)": "standard" },
          { "Large Presentation (Executive Boardroom)": "large" }
        ],
        default: "standard",
        section: "Style",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value Metric Format",
        display: "select",
        values: [
          { "Auto (Looker Formatted)": "auto" },
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_num" },
          { "Standard Currency ($1,234,567)": "currency" },
          { "Formatted Number (1,234,567)": "number" },
          { "Percentage (12.3%)": "percentage" },
          { "Decimal (2 Decimal Places)": "decimal_2dp" },
          { "Raw (Unformatted)": "raw" }
        ],
        default: "compact_currency",
        section: "Style",
        order: 7
      },
      colorScaleType: {
        type: "string",
        label: "Color Scale Metric Curve",
        display: "select",
        values: [
          { "Quantile (Equal Rank Distribution)": "quantile" },
          { "Linear (Direct Value Scale)": "linear" },
          { "Logarithmic (Outlier Dampened)": "log" }
        ],
        default: "quantile",
        section: "Style",
        order: 8
      },
      showGraticule: {
        type: "boolean",
        label: "Show Lat/Long Gridlines (Graticule)",
        default: true,
        section: "Style",
        order: 9
      },
      showCountryBorders: {
        type: "boolean",
        label: "Crisp Country Borders",
        default: true,
        section: "Style",
        order: 10
      },
      unmatchedCountryColor: {
        type: "string",
        label: "Unmatched / Empty Country Fill",
        display: "color",
        default: "#eef1f5",
        section: "Style",
        order: 11
      },
      bubbleColor: {
        type: "string",
        label: "Secondary Bubble Pin Color",
        display: "color",
        default: "#ea4335",
        section: "Style",
        order: 12
      }
    },

    // ------------------------------------------------------------------
    // Dynamic Field-Role Dropdowns
    // Populates field-role selectors dynamically from the query response
    // using Looker's `registerOptions` trigger.
    // ------------------------------------------------------------------
    _registerDynamicFieldOptions: function (queryResponse) {
      var self = this;
      var FIELD_ROLE_OPTIONS = {
        countryFieldOverride: { role: "dimension", defaultIdx: 0 },
        secondaryGroupOverride: { role: "dimension", defaultIdx: 1 },
        measureFieldOverride: { role: "measure", defaultIdx: 0 },
        secondaryMeasureOverride: { role: "measure", defaultIdx: 1 }
      };

      if (!queryResponse || !queryResponse.fields || typeof self.trigger !== "function") return;
      var f = queryResponse.fields;
      var dims = (f.dimensions && f.dimensions.length) ? f.dimensions : (f.dimension_like || []);
      var meas = (f.measures && f.measures.length) ? f.measures : (f.measure_like || []);
      if (!meas.length && f.table_calculations && f.table_calculations.length) meas = f.table_calculations;

      var signature = dims.map(function (d) { return d.name; }).join("|") + "::" + meas.map(function (m) { return m.name; }).join("|");
      if (self._dynamicFieldSignature === signature) return;
      self._dynamicFieldSignature = signature;

      if (!self._baseOptions) self._baseOptions = self.options || {};
      var newOptions = {};
      Object.keys(self._baseOptions).forEach(function (k) {
        newOptions[k] = Object.assign({}, self._baseOptions[k]);
      });

      function fieldLabel(fld) { return fld.label || fld.label_short || fld.name; }

      Object.keys(FIELD_ROLE_OPTIONS).forEach(function (key) {
        var spec = FIELD_ROLE_OPTIONS[key];
        if (!newOptions[key]) return;
        var list = spec.role === "measure" ? meas : (spec.role === "any" ? dims.concat(meas) : dims);
        var autoField = (spec.defaultIdx >= 0 && spec.defaultIdx < list.length) ? list[spec.defaultIdx] : null;
        var autoLabel = autoField ? ("Auto → " + fieldLabel(autoField)) : "Auto / None";
        var values = [];
        var autoEntry = {};
        autoEntry[autoLabel] = "";
        values.push(autoEntry);
        var seen = {};
        list.forEach(function (fld) {
          var lbl = fieldLabel(fld);
          if (seen[lbl]) lbl = lbl + " (" + fld.name + ")";
          seen[lbl] = true;
          var entry = {};
          entry[lbl] = fld.name;
          values.push(entry);
        });
        newOptions[key].type = "string";
        newOptions[key].display = "select";
        newOptions[key].values = values;
        newOptions[key].default = "";
      });

      try {
        self.trigger("registerOptions", newOptions);
      } catch (e) {
        console.warn("registerOptions unavailable in host:", e);
      }
    },

    create: function (element, config) {
      element.innerHTML = "";
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.overflow = "hidden";
      element.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

      var container = document.createElement("div");
      container.className = "wcm-root";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.position = "relative";
      container.style.overflow = "hidden";
      container.style.background = "#ffffff";

      // 0. Optional Header Title / Subtitle
      var headerDiv = document.createElement("div");
      headerDiv.className = "wcm-header-banner";
      headerDiv.style.display = "none";
      headerDiv.style.padding = "10px 16px 4px 16px";
      headerDiv.style.flexShrink = "0";
      container.appendChild(headerDiv);

      // 1. Executive Spatial KPI HUD Container
      var hudDiv = document.createElement("div");
      hudDiv.className = "wcm-hud-container";
      hudDiv.style.flexShrink = "0";
      hudDiv.style.padding = "8px 16px";
      hudDiv.style.background = "linear-gradient(180deg, #ffffff 0%, #f8fafd 100%)";
      hudDiv.style.borderBottom = "1px solid #e1e4e8";
      hudDiv.style.display = "flex";
      hudDiv.style.alignItems = "center";
      hudDiv.style.justifyContent = "space-between";
      hudDiv.style.gap = "12px";
      hudDiv.style.minHeight = "44px";
      container.appendChild(hudDiv);

      // 2. Search & Controls Bar
      var searchDiv = document.createElement("div");
      searchDiv.className = "wcm-search-bar";
      searchDiv.style.flexShrink = "0";
      searchDiv.style.padding = "6px 16px";
      searchDiv.style.background = "#ffffff";
      searchDiv.style.borderBottom = "1px solid #f0f2f5";
      searchDiv.style.display = "flex";
      searchDiv.style.alignItems = "center";
      searchDiv.style.justifyContent = "space-between";
      searchDiv.style.gap = "12px";
      container.appendChild(searchDiv);

      // 3. Map Viewport Canvas
      var mapWrapper = document.createElement("div");
      mapWrapper.className = "wcm-map-wrapper";
      mapWrapper.style.flex = "1";
      mapWrapper.style.position = "relative";
      mapWrapper.style.overflow = "hidden";
      mapWrapper.style.width = "100%";
      mapWrapper.style.height = "100%";
      mapWrapper.style.minHeight = "240px";
      container.appendChild(mapWrapper);

      // 4. Floating Pan/Zoom Map Controls
      var controlsDiv = document.createElement("div");
      controlsDiv.className = "wcm-controls";
      controlsDiv.style.position = "absolute";
      controlsDiv.style.bottom = "16px";
      controlsDiv.style.right = "16px";
      controlsDiv.style.display = "flex";
      controlsDiv.style.flexDirection = "column";
      controlsDiv.style.gap = "4px";
      controlsDiv.style.zIndex = "10";
      mapWrapper.appendChild(controlsDiv);

      // 5. Floating Legend Bar
      var legendDiv = document.createElement("div");
      legendDiv.className = "wcm-legend";
      legendDiv.style.position = "absolute";
      legendDiv.style.bottom = "16px";
      legendDiv.style.left = "16px";
      legendDiv.style.background = "rgba(255, 255, 255, 0.94)";
      legendDiv.style.backdropFilter = "blur(6px)";
      legendDiv.style.border = "1px solid #d0d7de";
      legendDiv.style.borderRadius = "8px";
      legendDiv.style.padding = "8px 12px";
      legendDiv.style.zIndex = "10";
      legendDiv.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
      mapWrapper.appendChild(legendDiv);

      element.appendChild(container);

      // ResizeObserver with threshold check (<4px) and debouncing
      var self = this;
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function (entries) {
          if (!self._lastData || !self._lastElement) return;
          var entry = entries[0];
          if (!entry) return;
          var cr = entry.contentRect;
          if (!self._lastW || !self._lastH || Math.abs(cr.width - self._lastW) > 4 || Math.abs(cr.height - self._lastH) > 4) {
            self._lastW = cr.width;
            self._lastH = cr.height;
            clearTimeout(self._resizeTimeout);
            self._resizeTimeout = setTimeout(function () {
              self.updateAsync(
                self._lastData,
                self._lastElement,
                self._lastConfig,
                self._lastQueryResponse,
                self._lastDetails,
                self._lastDone
              );
            }, 120);
          }
        });
        ro.observe(element);
      }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
      var self = this;
      this._lastData = data;
      this._lastElement = element;
      this._lastConfig = config;
      this._lastQueryResponse = queryResponse;
      this._lastDetails = details;
      this._lastDone = done;

      // Register dynamic field options based on current query schema
      this._registerDynamicFieldOptions(queryResponse);

      // Clear any running globe rotation timer
      if (this._rotationTimer) {
        this._rotationTimer.stop();
        this._rotationTimer = null;
      }

      // Basic validation
      if (!data || !data.length || !queryResponse || !queryResponse.fields) {
        if (typeof done === "function") done();
        return;
      }

      var dims = queryResponse.fields.dimensions || queryResponse.fields.dimension_like || [];
      var meas = queryResponse.fields.measures || queryResponse.fields.measure_like || [];
      var calcs = queryResponse.fields.table_calculations || [];
      var allMeasures = meas.concat(calcs);

      if (!dims.length || !allMeasures.length) {
        element.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#57606a;font-size:13px;font-family:sans-serif;">Please select at least 1 Country Dimension and 1 Numeric Measure.</div>';
        if (typeof done === "function") done();
        return;
      }

      // 1. Resolve Country Dimension (with config override fallback)
      var countryDim = dims[0];
      if (config.countryFieldOverride) {
        var cd = dims.find(function (d) { return d.name === config.countryFieldOverride; });
        if (cd) countryDim = cd;
      } else {
        for (var d = 0; d < dims.length; d++) {
          var testDim = dims[d];
          var matchCount = 0;
          for (var r = 0; r < Math.min(data.length, 15); r++) {
            var testVal = data[r][testDim.name] ? data[r][testDim.name].value : null;
            if (resolveCountry(testVal)) matchCount++;
          }
          if (matchCount >= 2) {
            countryDim = testDim;
            break;
          }
        }
      }

      // Secondary Group dimension (optional)
      var secondaryGroupDim = null;
      if (config.secondaryGroupOverride) {
        secondaryGroupDim = dims.find(function (d) { return d.name === config.secondaryGroupOverride; }) || null;
      } else if (dims.length > 1) {
        secondaryGroupDim = (dims[0].name === countryDim.name) ? dims[1] : dims[0];
      }

      // 2. Resolve Primary and Secondary Measures
      var primaryMeas = allMeasures[0];
      if (config.measureFieldOverride) {
        var pm = allMeasures.find(function (m) { return m.name === config.measureFieldOverride; });
        if (pm) primaryMeas = pm;
      }

      var secondaryMeas = allMeasures.length > 1 ? allMeasures[1] : null;
      if (config.secondaryMeasureOverride) {
        var sm = allMeasures.find(function (m) { return m.name === config.secondaryMeasureOverride; });
        if (sm) secondaryMeas = sm;
      } else if (allMeasures.length > 1 && allMeasures[0].name === primaryMeas.name) {
        secondaryMeas = allMeasures[1];
      }

      // 3. Extract options with safe defaults
      var layoutMode = config.layoutMode || "natural_earth";
      var continentFocus = config.continentFocus || "all";
      var showBubbleOverlay = config.showBubbleOverlay !== false;
      var hudMode = config.hudMode || "scorecard";
      var labelDensity = config.labelDensity || "leaders_only";
      var showSearch = config.showSearch !== false;
      var showLegend = config.showLegend !== false;
      var globeAutoRotate = config.globeAutoRotate === true;
      var valueFormat = config.valueFormat || "compact_currency";
      var colorThemeKey = config.colorTheme || "google_enterprise";
      var colorScaleType = config.colorScaleType || "quantile";
      var showGraticule = config.showGraticule !== false;
      var showCountryBorders = config.showCountryBorders !== false;
      var unmatchedColor = config.unmatchedCountryColor || "#eef1f5";
      var metricPolarity = config.metricPolarity || "higher_better";
      var fontScale = config.fontScale || "standard";
      var targetMode = config.targetCalculationMode || "dataset_mean";
      var fixedTarget = parseFloat(config.fixedTargetValue) || 0;
      var refLabel = config.referenceLineLabel || "Global Benchmark";
      var showReferenceLine = config.showReferenceLine !== false;
      var anomalyThresholdPct = parseFloat(config.anomalyThresholdPct) || 30;
      var sortBy = config.sortBy || "metric_desc";
      var topN = parseInt(config.topNLimit, 10) || 0;
      var enableOtherRollup = config.enableOtherRollup === true;
      var suppressZeroNull = config.suppressZeroNull === true;
      var customTitle = config.customTitle || "";
      var customSubtitle = config.customSubtitle || "";

      // Typography scale multiplier
      var fontMultiplier = fontScale === "compact" ? 0.88 : (fontScale === "large" ? 1.2 : 1.0);

      // Resolve theme & palette
      var theme = COLOR_THEMES[colorThemeKey] || COLOR_THEMES.google_enterprise;
      var paletteRamp = theme.ramp.slice();

      if (colorThemeKey === "custom_override" && config.customPrimaryColor) {
        var baseHex = config.customPrimaryColor;
        paletteRamp = [
          d3.interpolateRgb("#ffffff", baseHex)(0.15),
          d3.interpolateRgb("#ffffff", baseHex)(0.32),
          d3.interpolateRgb("#ffffff", baseHex)(0.50),
          d3.interpolateRgb("#ffffff", baseHex)(0.70),
          baseHex,
          d3.interpolateRgb(baseHex, "#000000")(0.25)
        ];
      }

      // If metric polarity is lower_better, invert color ramp
      if (metricPolarity === "lower_better") {
        paletteRamp.reverse();
      }

      var bubbleColor = config.bubbleColor || theme.bubble || "#ea4335";
      if (config.customSecondaryColor) bubbleColor = config.customSecondaryColor;

      // 4. Client-side high-density O(N) aggregation across 5,000+ rows
      var countryMap = {};
      var totalPrimaryVolume = 0;
      var totalSecondaryVolume = 0;
      var validRowCount = 0;

      data.forEach(function (row) {
        var rawCountry = row[countryDim.name] ? row[countryDim.name].value : null;
        var countryObj = resolveCountry(rawCountry);
        if (!countryObj) return;

        var pVal = row[primaryMeas.name] ? parseFloat(row[primaryMeas.name].value) : 0;
        if (isNaN(pVal)) pVal = 0;

        var sVal = 0;
        if (secondaryMeas && row[secondaryMeas.name]) {
          sVal = parseFloat(row[secondaryMeas.name].value);
          if (isNaN(sVal)) sVal = 0;
        }

        if (suppressZeroNull && pVal === 0 && sVal === 0) return;

        var id = countryObj.id;
        if (!countryMap[id]) {
          var links = [];
          if (row[countryDim.name] && row[countryDim.name].links) {
            links = row[countryDim.name].links;
          } else if (row[primaryMeas.name] && row[primaryMeas.name].links) {
            links = row[primaryMeas.name].links;
          }

          countryMap[id] = {
            country: countryObj,
            primaryValue: 0,
            secondaryValue: 0,
            rowCount: 0,
            links: links,
            renderedPrimary: row[primaryMeas.name] ? row[primaryMeas.name].rendered : null
          };
        }

        countryMap[id].primaryValue += pVal;
        countryMap[id].secondaryValue += sVal;
        countryMap[id].rowCount += 1;
        totalPrimaryVolume += pVal;
        totalSecondaryVolume += sVal;
        validRowCount++;
      });

      var countryList = Object.keys(countryMap).map(function (k) { return countryMap[k]; });

      // 5. Calculate Target Benchmark
      var nonZeroVals = countryList.map(function (c) { return c.primaryValue; }).filter(function (v) { return v > 0; });
      var targetBenchmark = 0;

      if (targetMode === "fixed") {
        targetBenchmark = fixedTarget;
      } else if (targetMode === "second_measure" && secondaryMeas) {
        targetBenchmark = countryList.length > 0 ? totalSecondaryVolume / countryList.length : 0;
      } else if (targetMode === "dataset_mean") {
        targetBenchmark = nonZeroVals.length > 0 ? (totalPrimaryVolume / nonZeroVals.length) : 0;
      } else if (targetMode === "dataset_median" && nonZeroVals.length > 0) {
        var srt = nonZeroVals.slice().sort(function (a, b) { return a - b; });
        var mid = Math.floor(srt.length / 2);
        targetBenchmark = srt.length % 2 !== 0 ? srt[mid] : (srt[mid - 1] + srt[mid]) / 2;
      } else if (targetMode === "percentile_p75" && nonZeroVals.length > 0) {
        var srt75 = nonZeroVals.slice().sort(function (a, b) { return a - b; });
        targetBenchmark = srt75[Math.floor(srt75.length * 0.75)];
      } else if (targetMode === "percentile_p90" && nonZeroVals.length > 0) {
        var srt90 = nonZeroVals.slice().sort(function (a, b) { return a - b; });
        targetBenchmark = srt90[Math.floor(srt90.length * 0.90)];
      }

      // Compute variance vs benchmark & anomaly flags
      countryList.forEach(function (c) {
        if (targetBenchmark > 0) {
          c.variancePct = ((c.primaryValue - targetBenchmark) / targetBenchmark) * 100;
          c.isAnomaly = Math.abs(c.variancePct) >= anomalyThresholdPct;
        } else {
          c.variancePct = 0;
          c.isAnomaly = false;
        }
      });

      // 6. Apply Sorting
      if (sortBy === "metric_desc") {
        countryList.sort(function (a, b) { return b.primaryValue - a.primaryValue; });
      } else if (sortBy === "metric_asc") {
        countryList.sort(function (a, b) { return a.primaryValue - b.primaryValue; });
      } else if (sortBy === "country_asc") {
        countryList.sort(function (a, b) { return a.country.name.localeCompare(b.country.name); });
      } else if (sortBy === "variance_desc") {
        countryList.sort(function (a, b) { return Math.abs(b.variancePct) - Math.abs(a.variancePct); });
      }

      // Assign ranks & shares
      countryList.forEach(function (item, idx) {
        item.rank = idx + 1;
        item.sharePct = totalPrimaryVolume > 0 ? (item.primaryValue / totalPrimaryVolume) * 100 : 0;
      });

      // 7. Handle Top-N & Rollup
      var otherSummary = null;
      var activeCountryList = countryList;
      if (topN > 0 && countryList.length > topN) {
        activeCountryList = countryList.slice(0, topN);
        if (enableOtherRollup) {
          var remaining = countryList.slice(topN);
          var otherPrimary = remaining.reduce(function (acc, r) { return acc + r.primaryValue; }, 0);
          var otherSec = remaining.reduce(function (acc, r) { return acc + r.secondaryValue; }, 0);
          otherSummary = {
            count: remaining.length,
            primaryValue: otherPrimary,
            secondaryValue: otherSec,
            sharePct: totalPrimaryVolume > 0 ? (otherPrimary / totalPrimaryVolume) * 100 : 0
          };
        }
      }

      // Number formatting helper
      function formatMetric(val, isSec) {
        if (val === null || val === undefined || isNaN(val)) return "0";
        if (valueFormat === "auto") {
          return d3.format(".3~s")(val).replace(/G$/, "B");
        } else if (valueFormat === "compact_currency") {
          return "$" + d3.format(".3~s")(val).replace(/G$/, "B");
        } else if (valueFormat === "compact_num") {
          return d3.format(".3~s")(val).replace(/G$/, "B");
        } else if (valueFormat === "currency") {
          return "$" + d3.format(",.0f")(val);
        } else if (valueFormat === "number") {
          return d3.format(",.0f")(val);
        } else if (valueFormat === "percentage") {
          return d3.format(".1f")(val) + "%";
        } else if (valueFormat === "decimal_2dp") {
          return d3.format(",.2f")(val);
        } else {
          return String(val);
        }
      }

      // 8. TopoJSON and Map Rendering
      function renderVisualization(world) {
        var root = element.querySelector(".wcm-root");
        if (!root) return;

        var headerDiv = root.querySelector(".wcm-header-banner");
        var hud = root.querySelector(".wcm-hud-container");
        var searchBar = root.querySelector(".wcm-search-bar");
        var mapWrapper = root.querySelector(".wcm-map-wrapper");
        var controls = mapWrapper.querySelector(".wcm-controls");
        var legend = mapWrapper.querySelector(".wcm-legend");

        // Custom Header Title / Subtitle
        if (customTitle || customSubtitle) {
          headerDiv.style.display = "block";
          var hHtml = "";
          if (customTitle) {
            hHtml += '<div style="font-size:' + (15 * fontMultiplier) + 'px;font-weight:700;color:#1f2328;letter-spacing:-0.01em;">' + customTitle + '</div>';
          }
          if (customSubtitle) {
            hHtml += '<div style="font-size:' + (11.5 * fontMultiplier) + 'px;color:#57606a;margin-top:2px;">' + customSubtitle + '</div>';
          }
          headerDiv.innerHTML = hHtml;
        } else {
          headerDiv.style.display = "none";
        }

        // Executive Spatial KPI HUD
        if (hudMode !== "none" && countryList.length > 0) {
          hud.style.display = "flex";
          var topCountry = countryList[0];

          if (hudMode === "compact_strip") {
            hud.style.padding = "4px 16px";
            hud.style.minHeight = "32px";
            hud.innerHTML =
              '<div style="display:flex;align-items:center;justify-content:space-between;width:100%;font-size:' + (11 * fontMultiplier) + 'px;">' +
                '<div style="display:flex;align-items:center;gap:16px;">' +
                  '<span><strong>' + (primaryMeas.label || primaryMeas.name) + ':</strong> ' + formatMetric(totalPrimaryVolume) + '</span>' +
                  '<span><strong>Leader:</strong> ' + topCountry.country.flag + ' ' + topCountry.country.name + ' (' + topCountry.sharePct.toFixed(1) + '%)</span>' +
                  (targetBenchmark > 0 && showReferenceLine ? '<span><strong>' + refLabel + ':</strong> ' + formatMetric(targetBenchmark) + '</span>' : '') +
                  '<span><strong>Active:</strong> ' + countryList.length + ' countries</span>' +
                '</div>' +
                (otherSummary ? '<span style="color:#57606a;">Other (' + otherSummary.count + '): ' + formatMetric(otherSummary.primaryValue) + ' (' + otherSummary.sharePct.toFixed(1) + '%)</span>' : '') +
              '</div>';
          } else {
            // Full Executive Scorecard HUD
            hud.style.padding = "8px 16px";
            hud.style.minHeight = "44px";
            var chipsHtml = activeCountryList.slice(0, 4).map(function (c) {
              return '<span class="wcm-chip" data-id="' + c.country.id + '" style="display:inline-flex;align-items:center;gap:4px;background:#ffffff;border:1px solid #d0d7de;border-radius:12px;padding:2px 8px;font-size:' + (11 * fontMultiplier) + 'px;font-weight:600;color:#24292f;cursor:pointer;transition:all 0.15s ease;">' +
                c.country.flag + ' ' + c.country.name + ' <span style="color:#57606a;font-weight:400;">' + formatMetric(c.primaryValue) + '</span>' +
                '</span>';
            }).join("");

            var benchmarkBlock = "";
            if (targetBenchmark > 0 && showReferenceLine) {
              var varLeader = topCountry.variancePct;
              var varColor = varLeader >= 0 ? (metricPolarity === "higher_better" ? "#1e8e3e" : "#d93025") : (metricPolarity === "higher_better" ? "#d93025" : "#1e8e3e");
              benchmarkBlock =
                '<div style="border-left:1px solid #d8dee4;height:24px;"></div>' +
                '<div>' +
                  '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">' + refLabel + '</div>' +
                  '<div style="font-size:' + (13 * fontMultiplier) + 'px;font-weight:600;color:#24292f;">' + formatMetric(targetBenchmark) + '</div>' +
                '</div>';
            }

            hud.innerHTML =
              '<div style="display:flex;align-items:center;justify-content:space-between;width:100%;flex-wrap:wrap;gap:8px;">' +
                '<div style="display:flex;align-items:center;gap:14px;">' +
                  '<div>' +
                    '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">' + (primaryMeas.label || primaryMeas.name) + ' (Global)</div>' +
                    '<div style="font-size:' + (17 * fontMultiplier) + 'px;font-weight:700;color:#1f2328;letter-spacing:-0.02em;">' + formatMetric(totalPrimaryVolume) + '</div>' +
                  '</div>' +
                  '<div style="border-left:1px solid #d8dee4;height:24px;"></div>' +
                  '<div>' +
                    '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">Leading Region (#1)</div>' +
                    '<div style="font-size:' + (13 * fontMultiplier) + 'px;font-weight:600;color:' + theme.accent + ';">' + topCountry.country.flag + ' ' + topCountry.country.name + ' (' + topCountry.sharePct.toFixed(1) + '%)</div>' +
                  '</div>' +
                  benchmarkBlock +
                  '<div style="border-left:1px solid #d8dee4;height:24px;"></div>' +
                  '<div>' +
                    '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">Active Countries</div>' +
                    '<div style="font-size:' + (14 * fontMultiplier) + 'px;font-weight:700;color:#24292f;">' + countryList.length + ' <span style="font-size:' + (10.5 * fontMultiplier) + 'px;font-weight:400;color:#57606a;">of ' + (world ? world.objects.countries.geometries.length : 177) + '</span></div>' +
                  '</div>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + chipsHtml + '</div>' +
              '</div>';

            var chips = hud.querySelectorAll(".wcm-chip");
            chips.forEach(function (chip) {
              chip.addEventListener("click", function () {
                var cid = this.getAttribute("data-id");
                highlightCountry(cid);
              });
            });
          }
        } else {
          hud.style.display = "none";
        }

        // Search Bar
        if (showSearch) {
          searchBar.style.display = "flex";
          searchBar.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;width:100%;max-width:340px;">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="#57606a"><path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-.82 4.74a6 6 0 1 0-1.06 1.06l3.65 3.65a.75.75 0 1 0 1.06-1.06l-3.65-3.65Z"></path></svg>' +
              '<input type="text" class="wcm-search-input" placeholder="Search country, ISO code, or continent..." value="' + (self._searchFilter || "") + '" style="width:100%;border:none;outline:none;font-size:' + (11.5 * fontMultiplier) + 'px;color:#24292f;background:transparent;" />' +
            '</div>' +
            '<div style="font-size:' + (11 * fontMultiplier) + 'px;color:#57606a;font-weight:500;">' + (secondaryMeas ? '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:' + bubbleColor + ';"></span> Bubble: ' + (secondaryMeas.label || secondaryMeas.name) + '</span>' : '') + '</div>';

          var searchInput = searchBar.querySelector(".wcm-search-input");
          searchInput.addEventListener("input", function (e) {
            self._searchFilter = e.target.value.toLowerCase().trim();
            applySearchHighlight(self._searchFilter);
          });
        } else {
          searchBar.style.display = "none";
        }

        // Setup SVG Canvas
        var width = mapWrapper.clientWidth || 800;
        var height = mapWrapper.clientHeight || 500;

        d3.select(mapWrapper).selectAll("svg").remove();

        var svg = d3.select(mapWrapper)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .style("display", "block")
          .style("background", layoutMode === "orthographic_globe" ? "#f8fafc" : "#ffffff");

        var defs = svg.append("defs");

        // Sphere radial gradient for 3D globe realism
        if (layoutMode === "orthographic_globe") {
          var globeGrad = defs.append("radialGradient")
            .attr("id", "wcm-globe-shading")
            .attr("cx", "42%")
            .attr("cy", "38%")
            .attr("r", "58%");
          globeGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff").attr("stop-opacity", 0.5);
          globeGrad.append("stop").attr("offset", "75%").attr("stop-color", "#000000").attr("stop-opacity", 0.08);
          globeGrad.append("stop").attr("offset", "100%").attr("stop-color", "#000000").attr("stop-opacity", 0.35);
        }

        // Drop shadow for bubbles
        var filter = defs.append("filter")
          .attr("id", "wcm-bubble-shadow")
          .attr("x", "-25%")
          .attr("y", "-25%")
          .attr("width", "150%")
          .attr("height", "150%");
        filter.append("feDropShadow")
          .attr("dx", "0")
          .attr("dy", "1.5")
          .attr("stdDeviation", "2")
          .attr("flood-opacity", "0.22");

        // Glow filter for search highlight
        var glow = defs.append("filter")
          .attr("id", "wcm-glow")
          .attr("x", "-20%")
          .attr("y", "-20%")
          .attr("width", "140%")
          .attr("height", "140%");
        glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
        var feMerge = glow.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // Setup Projection
        var projection;
        var initialScale = 140;

        if (layoutMode === "orthographic_globe") {
          initialScale = Math.min(width, height) * 0.42;
          projection = d3.geoOrthographic()
            .scale(initialScale)
            .translate([width / 2, height / 2])
            .rotate([0, -15]);
        } else if (layoutMode === "mercator") {
          initialScale = Math.min(width / 6.2, height / 3.4);
          projection = d3.geoMercator()
            .scale(initialScale)
            .translate([width / 2, height / 1.7]);
        } else if (layoutMode === "equal_earth") {
          initialScale = Math.min(width / 5.2, height / 2.7);
          projection = d3.geoEqualEarth()
            .scale(initialScale)
            .translate([width / 2, height / 2]);
        } else {
          initialScale = Math.min(width / 5.4, height / 2.8);
          projection = d3.geoNaturalEarth1()
            .scale(initialScale)
            .translate([width / 2, height / 2]);
        }

        // Continent Drilldown
        if (continentFocus !== "all" && CONTINENT_CONFIG[continentFocus]) {
          var cConf = CONTINENT_CONFIG[continentFocus];
          if (layoutMode === "orthographic_globe") {
            projection.rotate([-cConf.center[0], -cConf.center[1]]);
          } else {
            projection.center(cConf.center).scale(initialScale * cConf.scaleMultiplier);
          }
        }

        var path = d3.geoPath().projection(projection);

        // Map container <g>
        var mapG = svg.append("g").attr("class", "wcm-map-g");

        // Sphere ocean background for 3D globe or bounded projections
        if (layoutMode === "orthographic_globe" || layoutMode === "natural_earth" || layoutMode === "equal_earth") {
          mapG.append("path")
            .datum({ type: "Sphere" })
            .attr("class", "wcm-sphere-bg")
            .attr("d", path)
            .attr("fill", layoutMode === "orthographic_globe" ? "#eef4fb" : "#fbfcfd")
            .attr("stroke", "#d0d7de")
            .attr("stroke-width", 0.75);
        }

        // Graticule Lat/Long lines
        if (showGraticule) {
          var graticule = d3.geoGraticule10();
          mapG.append("path")
            .datum(graticule)
            .attr("class", "wcm-graticule")
            .attr("d", path)
            .attr("fill", "none")
            .attr("stroke", "#e1e4e8")
            .attr("stroke-width", 0.5)
            .attr("stroke-dasharray", "2,3")
            .attr("opacity", 0.85);
        }

        // Calculate Color Scales
        var primaryValues = countryList.map(function (c) { return c.primaryValue; }).filter(function (v) { return v > 0; });
        var colorScale;

        if (colorScaleType === "quantile" && primaryValues.length >= paletteRamp.length) {
          colorScale = d3.scaleQuantile()
            .domain(primaryValues)
            .range(paletteRamp);
        } else if (colorScaleType === "log" && primaryValues.length > 0) {
          var minPos = d3.min(primaryValues) || 1;
          var maxPos = d3.max(primaryValues) || 10;
          colorScale = d3.scaleLog()
            .domain([minPos, maxPos])
            .range([paletteRamp[0], paletteRamp[paletteRamp.length - 1]])
            .interpolate(d3.interpolateRgb);
        } else {
          var maxVal = d3.max(primaryValues) || 1;
          colorScale = d3.scaleQuantize()
            .domain([0, maxVal])
            .range(paletteRamp);
        }

        // Bubble Sizing Scale (proportional area)
        var bubbleScale = null;
        if (secondaryMeas) {
          var maxSec = d3.max(countryList, function (c) { return c.secondaryValue; }) || 1;
          bubbleScale = d3.scaleSqrt().domain([0, maxSec]).range([3, 22]);
        }

        // Draw Countries
        var countriesGeo = topojson.feature(world, world.objects.countries).features;
        var countriesGroup = mapG.append("g").attr("class", "wcm-countries");

        countriesGroup.selectAll("path")
          .data(countriesGeo)
          .enter()
          .append("path")
          .attr("class", function (d) { return "wcm-country wcm-country-" + d.id; })
          .attr("d", path)
          .attr("fill", function (d) {
            var dataItem = countryMap[String(d.id)];
            if (!dataItem || dataItem.primaryValue === 0) return unmatchedColor;
            if (colorScaleType === "log") return colorScale(Math.max(1, dataItem.primaryValue));
            return colorScale(dataItem.primaryValue);
          })
          .attr("stroke", showCountryBorders ? "#ffffff" : "none")
          .attr("stroke-width", showCountryBorders ? 0.6 : 0)
          .attr("stroke-linejoin", "round")
          .style("cursor", function (d) { return countryMap[String(d.id)] ? "pointer" : "default"; })
          .on("mouseenter", function (event, d) {
            var dataItem = countryMap[String(d.id)];
            d3.select(this)
              .attr("stroke", "#1f2328")
              .attr("stroke-width", 1.5);
            showTooltip(event, d, dataItem);
          })
          .on("mousemove", function (event) {
            positionTooltip(event);
          })
          .on("mouseleave", function (event, d) {
            d3.select(this)
              .attr("stroke", showCountryBorders ? "#ffffff" : "none")
              .attr("stroke-width", showCountryBorders ? 0.6 : 0);
            hideTooltip();
          })
          .on("click", function (event, d) {
            var dataItem = countryMap[String(d.id)];
            if (!dataItem) return;
            openDrill(event, dataItem);
          });

        // Sphere shading overlay on 3D globe for lighting realism
        if (layoutMode === "orthographic_globe") {
          mapG.append("path")
            .datum({ type: "Sphere" })
            .attr("class", "wcm-sphere-shading")
            .attr("d", path)
            .attr("fill", "url(#wcm-globe-shading)")
            .style("pointer-events", "none");
        }

        // Secondary Proportional Bubble Pin Overlay
        var bubblesGroup = null;
        if (showBubbleOverlay && bubbleScale) {
          bubblesGroup = mapG.append("g").attr("class", "wcm-bubbles");

          countriesGeo.forEach(function (feat) {
            var dataItem = countryMap[String(feat.id)];
            if (dataItem) {
              var c = d3.geoCentroid(feat);
              if (c && !isNaN(c[0]) && !isNaN(c[1])) {
                dataItem._centroid = c;
              }
            }
          });

          var bubbleData = countryList.filter(function (c) { return c._centroid && c.secondaryValue > 0; });

          bubblesGroup.selectAll("circle")
            .data(bubbleData)
            .enter()
            .append("circle")
            .attr("class", "wcm-bubble-pin")
            .attr("cx", function (d) { return projection(d._centroid) ? projection(d._centroid)[0] : -9999; })
            .attr("cy", function (d) { return projection(d._centroid) ? projection(d._centroid)[1] : -9999; })
            .attr("r", function (d) { return bubbleScale(d.secondaryValue); })
            .attr("fill", bubbleColor)
            .attr("fill-opacity", 0.78)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.2)
            .style("cursor", "pointer")
            .attr("filter", "url(#wcm-bubble-shadow)")
            .on("mouseenter", function (event, d) {
              d3.select(this).attr("fill-opacity", 1.0).attr("stroke", "#1f2328").attr("stroke-width", 2.0);
              showTooltip(event, { id: d.country.id }, d);
            })
            .on("mousemove", function (event) {
              positionTooltip(event);
            })
            .on("mouseleave", function () {
              d3.select(this).attr("fill-opacity", 0.78).attr("stroke", "#ffffff").attr("stroke-width", 1.2);
              hideTooltip();
            })
            .on("click", function (event, d) {
              openDrill(event, d);
            });
        }

        // Data Labels (Leaders only or All)
        if (labelDensity !== "hidden") {
          var labelsGroup = mapG.append("g").attr("class", "wcm-labels").style("pointer-events", "none");
          var labelCandidates = labelDensity === "leaders_only" ? activeCountryList.slice(0, 10) : activeCountryList;

          labelsGroup.selectAll("text")
            .data(labelCandidates.filter(function (d) { return d._centroid; }))
            .enter()
            .append("text")
            .attr("x", function (d) { return projection(d._centroid) ? projection(d._centroid)[0] : -9999; })
            .attr("y", function (d) { return projection(d._centroid) ? projection(d._centroid)[1] - (bubbleScale && d.secondaryValue > 0 ? bubbleScale(d.secondaryValue) + 3 : 5) : -9999; })
            .attr("text-anchor", "middle")
            .attr("font-size", (9.5 * fontMultiplier) + "px")
            .attr("font-weight", "700")
            .attr("fill", "#1f2328")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2.5)
            .attr("paint-order", "stroke")
            .text(function (d) { return d.country.iso2 || d.country.name; });
        }

        function updatePositions() {
          mapG.selectAll(".wcm-sphere-bg").attr("d", path);
          mapG.selectAll(".wcm-sphere-shading").attr("d", path);
          mapG.selectAll(".wcm-graticule").attr("d", path);
          countriesGroup.selectAll("path").attr("d", path);

          if (bubblesGroup) {
            bubblesGroup.selectAll("circle")
              .attr("cx", function (d) {
                var p = projection(d._centroid);
                if (!p) return -9999;
                if (layoutMode === "orthographic_globe") {
                  var rot = projection.rotate();
                  var angle = d3.geoDistance(d._centroid, [-rot[0], -rot[1]]);
                  return angle > Math.PI / 2 ? -9999 : p[0];
                }
                return p[0];
              })
              .attr("cy", function (d) {
                var p = projection(d._centroid);
                if (!p) return -9999;
                if (layoutMode === "orthographic_globe") {
                  var rot = projection.rotate();
                  var angle = d3.geoDistance(d._centroid, [-rot[0], -rot[1]]);
                  return angle > Math.PI / 2 ? -9999 : p[1];
                }
                return p[1];
              });
          }

          if (labelDensity !== "hidden") {
            mapG.selectAll(".wcm-labels text")
              .attr("x", function (d) {
                var p = projection(d._centroid);
                if (!p) return -9999;
                if (layoutMode === "orthographic_globe") {
                  var rot = projection.rotate();
                  var angle = d3.geoDistance(d._centroid, [-rot[0], -rot[1]]);
                  return angle > Math.PI / 2 ? -9999 : p[0];
                }
                return p[0];
              })
              .attr("y", function (d) {
                var p = projection(d._centroid);
                if (!p) return -9999;
                if (layoutMode === "orthographic_globe") {
                  var rot = projection.rotate();
                  var angle = d3.geoDistance(d._centroid, [-rot[0], -rot[1]]);
                  return angle > Math.PI / 2 ? -9999 : p[1] - (bubbleScale && d.secondaryValue > 0 ? bubbleScale(d.secondaryValue) + 3 : 5);
                }
                return p[1] - (bubbleScale && d.secondaryValue > 0 ? bubbleScale(d.secondaryValue) + 3 : 5);
              });
          }
        }

        // Tooltip Handling
        var tooltip = d3.select("body").select(".wcm-tooltip");
        if (tooltip.empty()) {
          tooltip = d3.select("body")
            .append("div")
            .attr("class", "wcm-tooltip")
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("background", "rgba(255, 255, 255, 0.98)")
            .style("border", "1px solid #d0d7de")
            .style("border-radius", "8px")
            .style("padding", "10px 14px")
            .style("box-shadow", "0 8px 24px rgba(140, 149, 159, 0.28)")
            .style("font-family", "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif")
            .style("display", "none")
            .style("min-width", "180px");
        }

        function showTooltip(event, geoFeature, dataItem) {
          var cid = String(geoFeature.id);
          var meta = COUNTRY_METADATA[cid];
          var countryName = meta ? meta.name : "Country #" + cid;
          var flag = meta ? meta.flag : "🌐";
          var continent = meta ? meta.continent.replace("_", " ").toUpperCase() : "";

          var pValStr = dataItem ? formatMetric(dataItem.primaryValue) : "No Data";
          var pMeasName = primaryMeas.label || primaryMeas.name;
          var shareStr = dataItem ? dataItem.sharePct.toFixed(1) + "% of Global" : "";
          var rankStr = dataItem ? "#" + dataItem.rank + " Globally" : "Unranked";

          var sValHtml = "";
          if (secondaryMeas && dataItem && dataItem.secondaryValue !== undefined) {
            sValHtml =
              '<div style="display:flex;justify-content:space-between;gap:12px;margin-top:4px;padding-top:4px;border-top:1px dashed #e1e4e8;">' +
                '<span style="color:#57606a;">' + (secondaryMeas.label || secondaryMeas.name) + ':</span>' +
                '<span style="font-weight:700;text-align:right;color:' + bubbleColor + ';">' + formatMetric(dataItem.secondaryValue, true) + '</span>' +
              '</div>';
          }

          var benchmarkHtml = "";
          if (targetBenchmark > 0 && showReferenceLine && dataItem) {
            var diff = dataItem.primaryValue - targetBenchmark;
            var diffPct = dataItem.variancePct;
            var isGood = metricPolarity === "higher_better" ? diff >= 0 : diff <= 0;
            var sign = diff >= 0 ? "+" : "";
            var bColor = isGood ? "#1e8e3e" : "#d93025";
            var anomalyTag = dataItem.isAnomaly ? ' <span style="background:#fee2e2;color:#991b1b;padding:1px 4px;border-radius:4px;font-size:9.5px;font-weight:700;">ALERT</span>' : '';

            benchmarkHtml =
              '<div style="display:flex;justify-content:space-between;gap:12px;margin-top:4px;font-size:' + (10.5 * fontMultiplier) + 'px;">' +
                '<span style="color:#57606a;">vs ' + refLabel + ':</span>' +
                '<span style="font-weight:600;color:' + bColor + ';">' + sign + diffPct.toFixed(1) + '%' + anomalyTag + '</span>' +
              '</div>';
          }

          tooltip
            .style("display", "block")
            .html(
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px;">' +
                '<div style="font-size:' + (13 * fontMultiplier) + 'px;font-weight:700;color:#1f2328;display:flex;align-items:center;gap:6px;">' +
                  '<span>' + flag + '</span>' +
                  '<span>' + countryName + '</span>' +
                '</div>' +
                '<div style="font-size:' + (10 * fontMultiplier) + 'px;font-weight:700;color:#57606a;background:#f6f8fa;padding:1px 6px;border-radius:10px;">' + rankStr + '</div>' +
              '</div>' +
              '<div style="font-size:' + (10 * fontMultiplier) + 'px;color:#57606a;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;">' + continent + (meta && meta.iso2 ? ' &bull; ' + meta.iso2 : '') + '</div>' +
              '<div style="display:flex;justify-content:space-between;gap:12px;font-size:' + (11.5 * fontMultiplier) + 'px;">' +
                '<span style="color:#57606a;">' + pMeasName + ':</span>' +
                '<span style="font-weight:700;color:#1f2328;">' + pValStr + '</span>' +
              '</div>' +
              (shareStr ? '<div style="font-size:' + (10.5 * fontMultiplier) + 'px;color:#57606a;text-align:right;margin-top:1px;">' + shareStr + '</div>' : '') +
              sValHtml +
              benchmarkHtml +
              (dataItem && dataItem.links && dataItem.links.length ? '<div style="font-size:' + (10 * fontMultiplier) + 'px;color:#0969da;margin-top:6px;padding-top:4px;border-top:1px solid #f0f2f5;">Click to drill →</div>' : '')
            );

          positionTooltip(event);
        }

        function positionTooltip(event) {
          var pad = 14;
          var x = event.pageX + pad;
          var y = event.pageY + pad;
          var node = tooltip.node();
          if (node) {
            var w = node.offsetWidth || 180;
            var h = node.offsetHeight || 100;
            if (x + w > window.innerWidth - 10) x = event.pageX - w - pad;
            if (y + h > window.innerHeight - 10) y = event.pageY - h - pad;
          }
          tooltip.style("left", x + "px").style("top", y + "px");
        }

        function hideTooltip() {
          tooltip.style("display", "none");
        }

        function openDrill(event, dataItem) {
          if (!dataItem) return;
          if (dataItem.links && dataItem.links.length && LookerCharts && LookerCharts.Utils && LookerCharts.Utils.openDrillMenu) {
            LookerCharts.Utils.openDrillMenu({
              links: dataItem.links,
              event: event
            });
          }
        }

        // Pan & Zoom with D3 Zoom
        var zoom = d3.zoom()
          .scaleExtent([0.7, 12])
          .on("zoom", function (event) {
            mapG.attr("transform", event.transform);
          });

        if (layoutMode === "orthographic_globe") {
          var drag = d3.drag()
            .on("drag", function (event) {
              var r = projection.rotate();
              var k = 75 / projection.scale();
              projection.rotate([r[0] + event.dx * k, r[1] - event.dy * k]);
              updatePositions();
            });
          svg.call(drag);

          if (globeAutoRotate) {
            var rotSpeed = 0.35;
            self._rotationTimer = d3.timer(function () {
              var r = projection.rotate();
              projection.rotate([r[0] + rotSpeed, r[1]]);
              updatePositions();
            });
          }
        } else {
          svg.call(zoom);
        }

        // Floating Map Controls (Zoom In, Zoom Out, Reset)
        controls.innerHTML =
          '<button class="wcm-btn-zoom-in" title="Zoom in" style="width:28px;height:28px;background:#ffffff;border:1px solid #d0d7de;border-radius:6px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#24292f;box-shadow:0 1px 3px rgba(0,0,0,0.06);">+</button>' +
          '<button class="wcm-btn-zoom-out" title="Zoom out" style="width:28px;height:28px;background:#ffffff;border:1px solid #d0d7de;border-radius:6px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#24292f;box-shadow:0 1px 3px rgba(0,0,0,0.06);">&minus;</button>' +
          '<button class="wcm-btn-reset" title="Reset View" style="width:28px;height:28px;background:#ffffff;border:1px solid #d0d7de;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#24292f;box-shadow:0 1px 3px rgba(0,0,0,0.06);">&#x21bb;</button>';

        controls.querySelector(".wcm-btn-zoom-in").addEventListener("click", function () {
          if (layoutMode === "orthographic_globe") {
            projection.scale(projection.scale() * 1.3);
            updatePositions();
          } else {
            svg.transition().duration(250).call(zoom.scaleBy, 1.3);
          }
        });

        controls.querySelector(".wcm-btn-zoom-out").addEventListener("click", function () {
          if (layoutMode === "orthographic_globe") {
            projection.scale(projection.scale() / 1.3);
            updatePositions();
          } else {
            svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.3);
          }
        });

        controls.querySelector(".wcm-btn-reset").addEventListener("click", function () {
          if (layoutMode === "orthographic_globe") {
            projection.scale(initialScale).rotate([0, -15]);
            updatePositions();
          } else {
            svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity);
          }
        });

        // Legend Rendering
        if (showLegend && primaryValues.length > 0) {
          legend.style.display = "block";
          var minVal = d3.min(primaryValues) || 0;
          var maxVal = d3.max(primaryValues) || 1;

          var rampCells = paletteRamp.map(function (c) {
            return '<div style="flex:1;height:8px;background:' + c + ';"></div>';
          }).join("");

          legend.innerHTML =
            '<div style="font-size:' + (9.5 * fontMultiplier) + 'px;font-weight:700;color:#57606a;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">' + (primaryMeas.label || primaryMeas.name) + '</div>' +
            '<div style="display:flex;width:140px;border-radius:3px;overflow:hidden;border:1px solid #d0d7de;">' + rampCells + '</div>' +
            '<div style="display:flex;justify-content:space-between;margin-top:3px;font-size:' + (9.5 * fontMultiplier) + 'px;color:#57606a;">' +
              '<span>' + formatMetric(minVal) + '</span>' +
              (targetBenchmark > 0 && showReferenceLine ? '<span style="font-weight:700;color:#1f2328;" title="' + refLabel + '">' + formatMetric(targetBenchmark) + '</span>' : '') +
              '<span>' + formatMetric(maxVal) + '</span>' +
            '</div>';
        } else {
          legend.style.display = "none";
        }

        // Country Highlight and Search Helper
        function highlightCountry(cid) {
          countriesGroup.selectAll(".wcm-country")
            .attr("stroke", showCountryBorders ? "#ffffff" : "none")
            .attr("stroke-width", showCountryBorders ? 0.6 : 0)
            .attr("filter", null);

          if (!cid) return;

          var target = countriesGroup.select(".wcm-country-" + cid);
          if (!target.empty()) {
            target
              .attr("stroke", "#1f2328")
              .attr("stroke-width", 2.2)
              .attr("filter", "url(#wcm-glow)")
              .raise();

            var dataItem = countryMap[cid];
            if (dataItem && dataItem._centroid && layoutMode === "orthographic_globe") {
              projection.rotate([-dataItem._centroid[0], -dataItem._centroid[1]]);
              updatePositions();
            }
          }
        }

        function applySearchHighlight(term) {
          if (!term) {
            highlightCountry(null);
            return;
          }
          var matched = countryList.find(function (c) {
            var n = c.country.name.toLowerCase();
            var i2 = (c.country.iso2 || "").toLowerCase();
            var i3 = (c.country.iso3 || "").toLowerCase();
            var cont = (c.country.continent || "").toLowerCase();
            return n.indexOf(term) !== -1 || i2 === term || i3 === term || cont.indexOf(term) !== -1;
          });

          if (matched) {
            highlightCountry(matched.country.id);
          } else {
            highlightCountry(null);
          }
        }

        if (self._searchFilter) {
          applySearchHighlight(self._searchFilter);
        }

        if (typeof done === "function") done();
      }

      // TopoJSON Caching & Loading
      if (cachedWorldData) {
        renderVisualization(cachedWorldData);
      } else {
        d3.json(WORLD_TOPOJSON_URL).then(function (world) {
          cachedWorldData = world;
          renderVisualization(world);
        }).catch(function (err) {
          element.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#cf222e;font-size:13px;font-family:sans-serif;">Error loading TopoJSON world atlas map data: ' + err.message + '</div>';
          if (typeof done === "function") done();
        });
      }
    }
  });
})();
