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
      // SECTION 1: DISPLAY (Display & Functional)
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
      showBubbleOverlay: {
        type: "boolean",
        label: "Secondary Bubble Pin Overlay",
        default: true,
        section: "Display",
        order: 3
      },
      showExecutiveHUD: {
        type: "boolean",
        label: "Executive Spatial KPI HUD",
        default: true,
        section: "Display",
        order: 4
      },
      showSearch: {
        type: "boolean",
        label: "Real-Time Country Search Bar",
        default: true,
        section: "Display",
        order: 5
      },
      globeAutoRotate: {
        type: "boolean",
        label: "Auto-Rotate 3D Globe (3D Mode Only)",
        default: false,
        section: "Display",
        order: 6
      },
      valueFormat: {
        type: "string",
        label: "Value Metric Format",
        display: "select",
        values: [
          { "Compact Currency ($1.2M, $45K)": "compact_currency" },
          { "Compact Number (1.2M, 45K)": "compact_num" },
          { "Standard Currency ($1,234,567)": "currency" },
          { "Formatted Number (1,234,567)": "number" },
          { "Percentage (12.3%)": "percentage" }
        ],
        default: "compact_currency",
        section: "Display",
        order: 7
      },

      // ==========================================
      // SECTION 2: STYLE (Aesthetics & Palettes)
      // ==========================================
      colorTheme: {
        type: "string",
        label: "Color Theme Palette",
        display: "select",
        values: [
          { "Google Enterprise Blue": "google_enterprise" },
          { "Emerald & Teal": "emerald_slate" },
          { "Sunset Amber & Coral": "sunset_amber" },
          { "Ocean Breeze & Indigo": "ocean_breeze" },
          { "Crimson & Rose": "crimson_slate" },
          { "Monochrome Graphite": "monochrome_slate" }
        ],
        default: "google_enterprise",
        section: "Style",
        order: 1
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
        order: 2
      },
      showGraticule: {
        type: "boolean",
        label: "Show Lat/Long Gridlines (Graticule)",
        default: true,
        section: "Style",
        order: 3
      },
      showCountryBorders: {
        type: "boolean",
        label: "Crisp Country Borders",
        default: true,
        section: "Style",
        order: 4
      },
      unmatchedCountryColor: {
        type: "string",
        label: "Unmatched / Empty Country Fill",
        display: "color",
        default: "#eef1f5",
        section: "Style",
        order: 5
      },
      bubbleColor: {
        type: "string",
        label: "Secondary Bubble Pin Color",
        display: "color",
        default: "#ea4335",
        section: "Style",
        order: 6
      }
    },

    create: function (element, config) {
      // Safe base styles: Never force 100% width/height on element itself
      element.style.boxSizing = "border-box";
      element.style.padding = "0";
      element.style.margin = "0";
      element.style.overflow = "hidden";
      element.style.position = "relative";
      element.style.fontFamily = "Google Sans, Roboto, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

      // Clear container
      element.innerHTML = "";

      var root = document.createElement("div");
      root.className = "wcm-root";
      root.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#ffffff;box-sizing:border-box;";
      element.appendChild(root);

      // HUD Container (top)
      var hud = document.createElement("div");
      hud.className = "wcm-hud-container";
      hud.style.cssText = "flex:0 0 auto;padding:10px 14px 6px 14px;box-sizing:border-box;display:none;background:#fafbfc;border-bottom:1px solid #e1e4e8;";
      root.appendChild(hud);

      // Search & Control Bar
      var searchBar = document.createElement("div");
      searchBar.className = "wcm-search-bar";
      searchBar.style.cssText = "flex:0 0 auto;padding:6px 14px;display:none;align-items:center;justify-content:space-between;background:#ffffff;border-bottom:1px solid #edf0f2;box-sizing:border-box;";
      root.appendChild(searchBar);

      // Main Canvas / Map Wrapper
      var mapWrapper = document.createElement("div");
      mapWrapper.className = "wcm-map-wrapper";
      mapWrapper.style.cssText = "flex:1 1 0;min-height:0;position:relative;width:100%;overflow:hidden;";
      root.appendChild(mapWrapper);

      // Floating Zoom / Reset Controls
      var controls = document.createElement("div");
      controls.className = "wcm-controls";
      controls.style.cssText = "position:absolute;bottom:14px;right:14px;display:flex;flex-direction:column;gap:6px;z-index:10;";
      mapWrapper.appendChild(controls);

      // Legend Container (bottom left)
      var legend = document.createElement("div");
      legend.className = "wcm-legend";
      legend.style.cssText = "position:absolute;bottom:14px;left:14px;background:rgba(255,255,255,0.92);backdrop-filter:blur(8px);border:1px solid #d0d7de;border-radius:6px;padding:8px 12px;font-size:11px;color:#24292f;box-shadow:0 2px 8px rgba(0,0,0,0.06);z-index:10;pointer-events:none;";
      mapWrapper.appendChild(legend);

      // Shared Global Tooltip
      var tooltip = d3.select("body").select(".wcm-tooltip");
      if (tooltip.empty()) {
        tooltip = d3.select("body")
          .append("div")
          .attr("class", "wcm-tooltip")
          .style("position", "absolute")
          .style("visibility", "hidden")
          .style("background", "rgba(255,255,255,0.96)")
          .style("backdrop-filter", "blur(10px)")
          .style("border", "1px solid #d0d7de")
          .style("border-radius", "8px")
          .style("padding", "10px 14px")
          .style("font-family", "Google Sans, Roboto, Inter, sans-serif")
          .style("font-size", "12px")
          .style("color", "#1f2328")
          .style("box-shadow", "0 8px 24px rgba(140,149,159,0.25)")
          .style("pointer-events", "none")
          .style("z-index", "100000")
          .style("transition", "opacity 0.12s ease");
      }

      // Caching variables for ResizeObserver
      this._lastData = null;
      this._lastElement = element;
      this._lastConfig = null;
      this._lastQueryResponse = null;
      this._lastDetails = null;
      this._lastDone = null;
      this._rotationTimer = null;
      this._currentZoomTransform = d3.zoomIdentity;
      this._searchFilter = "";

      // Attach debounced ResizeObserver
      var self = this;
      var resizeTimeout = null;
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function () {
          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(function () {
            if (self._lastData && self._lastQueryResponse && self._lastElement) {
              self.updateAsync(
                self._lastData,
                self._lastElement,
                self._lastConfig,
                self._lastQueryResponse,
                self._lastDetails,
                self._lastDone || function () {}
              );
            }
          }, 80);
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

      // Find the best dimension matching countries
      var countryDim = dims[0];
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

      var primaryMeas = allMeasures[0];
      var secondaryMeas = allMeasures.length > 1 ? allMeasures[1] : null;

      // Extract options with safe fallbacks
      var layoutMode = config.layoutMode || "natural_earth";
      var continentFocus = config.continentFocus || "all";
      var showBubbleOverlay = config.showBubbleOverlay !== false;
      var showExecutiveHUD = config.showExecutiveHUD !== false;
      var showSearch = config.showSearch !== false;
      var globeAutoRotate = config.globeAutoRotate === true;
      var valueFormat = config.valueFormat || "compact_currency";
      var colorThemeKey = config.colorTheme || "google_enterprise";
      var colorScaleType = config.colorScaleType || "quantile";
      var showGraticule = config.showGraticule !== false;
      var showCountryBorders = config.showCountryBorders !== false;
      var unmatchedColor = config.unmatchedCountryColor || "#eef1f5";
      var bubbleColor = config.bubbleColor || (COLOR_THEMES[colorThemeKey] ? COLOR_THEMES[colorThemeKey].bubble : "#ea4335");

      var theme = COLOR_THEMES[colorThemeKey] || COLOR_THEMES.google_enterprise;

      // Client-side high-density aggregation across 5,000+ rows
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

        var id = countryObj.id;
        if (!countryMap[id]) {
          // Collect drill links from cell
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

      // Compute ranks and percentages
      var countryList = Object.keys(countryMap).map(function (k) { return countryMap[k]; });
      countryList.sort(function (a, b) { return b.primaryValue - a.primaryValue; });

      countryList.forEach(function (item, idx) {
        item.rank = idx + 1;
        item.sharePct = totalPrimaryVolume > 0 ? (item.primaryValue / totalPrimaryVolume) * 100 : 0;
      });

      // Number formatting helper
      function formatMetric(val, isSec) {
        if (val === null || val === undefined || isNaN(val)) return "0";
        if (valueFormat === "compact_currency") {
          return "$" + d3.format(".3~s")(val).replace(/G$/, "B");
        } else if (valueFormat === "compact_num") {
          return d3.format(".3~s")(val).replace(/G$/, "B");
        } else if (valueFormat === "currency") {
          return "$" + d3.format(",.0f")(val);
        } else if (valueFormat === "percentage") {
          return d3.format(".1f")(val) + "%";
        } else {
          return d3.format(",.0f")(val);
        }
      }

      // Ensure TopoJSON is loaded
      function renderVisualization(world) {
        var root = element.querySelector(".wcm-root");
        if (!root) return;

        var hud = root.querySelector(".wcm-hud-container");
        var searchBar = root.querySelector(".wcm-search-bar");
        var mapWrapper = root.querySelector(".wcm-map-wrapper");
        var controls = mapWrapper.querySelector(".wcm-controls");
        var legend = mapWrapper.querySelector(".wcm-legend");

        // 1. Render Executive Spatial KPI HUD
        if (showExecutiveHUD && countryList.length > 0) {
          hud.style.display = "flex";
          var topCountry = countryList[0];
          var secondCountry = countryList.length > 1 ? countryList[1] : null;

          var chipsHtml = countryList.slice(0, 4).map(function (c) {
            return '<span class="wcm-chip" data-id="' + c.country.id + '" style="display:inline-flex;align-items:center;gap:4px;background:#ffffff;border:1px solid #d0d7de;border-radius:12px;padding:2px 8px;font-size:11px;font-weight:600;color:#24292f;cursor:pointer;transition:all 0.15s ease;">' +
              c.country.flag + ' ' + c.country.name + ' <span style="color:#57606a;font-weight:400;">' + formatMetric(c.primaryValue) + '</span>' +
              '</span>';
          }).join("");

          hud.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:space-between;width:100%;flex-wrap:wrap;gap:8px;">' +
              '<div style="display:flex;align-items:center;gap:14px;">' +
                '<div>' +
                  '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">' + (primaryMeas.label || primaryMeas.name) + ' (Global)</div>' +
                  '<div style="font-size:17px;font-weight:700;color:#1f2328;letter-spacing:-0.02em;">' + formatMetric(totalPrimaryVolume) + '</div>' +
                '</div>' +
                '<div style="border-left:1px solid #d8dee4;height:24px;"></div>' +
                '<div>' +
                  '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">Leading Region (#1)</div>' +
                  '<div style="font-size:13px;font-weight:600;color:' + theme.accent + ';">' + topCountry.country.flag + ' ' + topCountry.country.name + ' (' + topCountry.sharePct.toFixed(1) + '%)</div>' +
                '</div>' +
                '<div style="border-left:1px solid #d8dee4;height:24px;"></div>' +
                '<div>' +
                  '<div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#57606a;">Active Countries</div>' +
                  '<div style="font-size:14px;font-weight:700;color:#24292f;">' + countryList.length + ' <span style="font-size:11px;font-weight:400;color:#57606a;">of ' + (world ? world.objects.countries.geometries.length : 177) + '</span></div>' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + chipsHtml + '</div>' +
            '</div>';

          // Click chip to highlight country
          var chips = hud.querySelectorAll(".wcm-chip");
          chips.forEach(function (chip) {
            chip.addEventListener("click", function () {
              var cid = this.getAttribute("data-id");
              highlightCountry(cid);
            });
          });
        } else {
          hud.style.display = "none";
        }

        // 2. Render Search Bar
        if (showSearch) {
          searchBar.style.display = "flex";
          searchBar.innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;width:100%;max-width:340px;">' +
              '<svg width="14" height="14" viewBox="0 0 16 16" fill="#57606a"><path d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-.82 4.74a6 6 0 1 0-1.06 1.06l3.65 3.65a.75.75 0 1 0 1.06-1.06l-3.65-3.65Z"></path></svg>' +
              '<input type="text" class="wcm-search-input" placeholder="Search country, ISO code, or continent..." value="' + (self._searchFilter || "") + '" style="width:100%;border:none;outline:none;font-size:12px;color:#24292f;background:transparent;" />' +
            '</div>' +
            '<div style="font-size:11px;color:#57606a;font-weight:500;">' + (secondaryMeas ? '<span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:' + bubbleColor + ';"></span> Bubble: ' + (secondaryMeas.label || secondaryMeas.name) + '</span>' : '') + '</div>';

          var searchInput = searchBar.querySelector(".wcm-search-input");
          searchInput.addEventListener("input", function (e) {
            self._searchFilter = e.target.value.toLowerCase().trim();
            applySearchHighlight(self._searchFilter);
          });
        } else {
          searchBar.style.display = "none";
        }

        // 3. Setup SVG Canvas
        var width = mapWrapper.clientWidth || 800;
        var height = mapWrapper.clientHeight || 500;

        // Clean existing SVG
        d3.select(mapWrapper).selectAll("svg").remove();

        var svg = d3.select(mapWrapper)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .style("display", "block")
          .style("background", layoutMode === "orthographic_globe" ? "#f8fafc" : "#ffffff");

        // Defs for gradients, dropshadow, and sphere shading
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

        // 4. Setup Projection
        var projection;
        var initialScale = 140;
        var initialCenter = [0, 15];

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
          // Default: Natural Earth
          initialScale = Math.min(width / 5.4, height / 2.8);
          projection = d3.geoNaturalEarth1()
            .scale(initialScale)
            .translate([width / 2, height / 2]);
        }

        // Continent Drilldown framing
        if (continentFocus !== "all" && CONTINENT_CONFIG[continentFocus]) {
          var cConf = CONTINENT_CONFIG[continentFocus];
          if (layoutMode === "orthographic_globe") {
            projection.rotate([-cConf.center[0], -cConf.center[1]]);
          } else {
            projection.center(cConf.center).scale(initialScale * cConf.scaleMultiplier);
          }
        }

        var path = d3.geoPath().projection(projection);

        // Map container <g> with zoom/pan
        var mapG = svg.append("g").attr("class", "wcm-map-g");

        // Setup Color Scale
        var primaryValues = countryList.map(function (c) { return c.primaryValue; }).filter(function (v) { return v > 0; });
        var colorScale;

        if (colorScaleType === "quantile" && primaryValues.length >= theme.ramp.length) {
          colorScale = d3.scaleQuantile()
            .domain(primaryValues)
            .range(theme.ramp);
        } else if (colorScaleType === "log" && primaryValues.length > 0) {
          var minP = d3.min(primaryValues) || 1;
          var maxP = d3.max(primaryValues) || 100;
          colorScale = d3.scaleLog()
            .domain([minP, maxP])
            .range([theme.ramp[0], theme.ramp[theme.ramp.length - 1]])
            .interpolate(d3.interpolateHcl);
        } else {
          var minV = d3.min(primaryValues) || 0;
          var maxV = d3.max(primaryValues) || 100;
          colorScale = d3.scaleQuantize()
            .domain([minV, maxV])
            .range(theme.ramp);
        }

        // Secondary Measure Bubble Scale
        var bubbleScale = null;
        if (secondaryMeas && showBubbleOverlay) {
          var secValues = countryList.map(function (c) { return c.secondaryValue; }).filter(function (v) { return v > 0; });
          var maxSec = d3.max(secValues) || 1;
          bubbleScale = d3.scaleSqrt().domain([0, maxSec]).range([3, 22]);
        }

        // Extract GeoJSON features
        var countriesGeo = topojson.feature(world, world.objects.countries).features;

        // Background Sphere / Ocean
        if (layoutMode === "orthographic_globe") {
          mapG.append("path")
            .datum({ type: "Sphere" })
            .attr("class", "wcm-ocean")
            .attr("d", path)
            .attr("fill", "#eef4fa")
            .attr("stroke", "#c5d4e8")
            .attr("stroke-width", 1.2);
        }

        // Graticule Lat/Long lines
        if (showGraticule) {
          var graticule = d3.geoGraticule()();
          mapG.append("path")
            .datum(graticule)
            .attr("class", "wcm-graticule")
            .attr("d", path)
            .attr("fill", "none")
            .attr("stroke", layoutMode === "orthographic_globe" ? "#dce7f3" : "#edf2f7")
            .attr("stroke-width", 0.6)
            .attr("stroke-dasharray", "2,3")
            .attr("pointer-events", "none");
        }

        // Render Country Polygons
        var countriesGroup = mapG.append("g").attr("class", "wcm-countries");

        var countryPaths = countriesGroup.selectAll("path")
          .data(countriesGeo)
          .join("path")
          .attr("class", "wcm-country")
          .attr("data-id", function (d) { return d.id || (d.properties ? d.properties.name : ""); })
          .attr("d", path)
          .attr("fill", function (d) {
            var id = String(d.id || (d.properties ? d.properties.name : ""));
            var dataItem = countryMap[id];
            if (dataItem && dataItem.primaryValue > 0) {
              return colorScale(dataItem.primaryValue);
            }
            return unmatchedColor;
          })
          .attr("stroke", showCountryBorders ? "#ffffff" : "none")
          .attr("stroke-width", 0.6)
          .attr("stroke-linejoin", "round")
          .style("cursor", function (d) {
            var id = String(d.id || (d.properties ? d.properties.name : ""));
            return countryMap[id] ? "pointer" : "default";
          })
          .style("transition", "fill 0.15s ease, stroke-width 0.15s ease");

        // Sphere shading overlay for 3D Globe
        if (layoutMode === "orthographic_globe") {
          mapG.append("path")
            .datum({ type: "Sphere" })
            .attr("class", "wcm-globe-shade")
            .attr("d", path)
            .attr("fill", "url(#wcm-globe-shading)")
            .attr("pointer-events", "none");
        }

        // Secondary Bubble Pins Layer
        var bubblesGroup = null;
        if (showBubbleOverlay && bubbleScale) {
          bubblesGroup = mapG.append("g").attr("class", "wcm-bubbles");

          countriesGeo.forEach(function (feature) {
            var id = String(feature.id || (feature.properties ? feature.properties.name : ""));
            var dataItem = countryMap[id];
            if (!dataItem || dataItem.secondaryValue <= 0) return;

            var centroid = d3.geoCentroid(feature);
            if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return;

            dataItem._centroid = centroid;
          });

          var bubbleData = countryList.filter(function (c) { return c._centroid && c.secondaryValue > 0; });

          bubblesGroup.selectAll("circle")
            .data(bubbleData)
            .join("circle")
            .attr("class", "wcm-bubble-pin")
            .attr("data-id", function (d) { return d.country.id; })
            .attr("r", function (d) { return bubbleScale(d.secondaryValue); })
            .attr("fill", bubbleColor)
            .attr("fill-opacity", 0.78)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5)
            .attr("filter", "url(#wcm-bubble-shadow)")
            .style("cursor", "pointer")
            .style("transition", "all 0.15s ease");

          updateBubblePositions();
        }

        function updateBubblePositions() {
          if (!bubblesGroup) return;
          bubblesGroup.selectAll("circle")
            .each(function (d) {
              var pt = projection(d._centroid);
              var circle = d3.select(this);
              if (pt && !isNaN(pt[0]) && !isNaN(pt[1])) {
                // In orthographic mode, check if behind globe horizon
                if (layoutMode === "orthographic_globe") {
                  var rot = projection.rotate();
                  var dist = d3.geoDistance(d._centroid, [-rot[0], -rot[1]]);
                  if (dist > Math.PI / 2) {
                    circle.style("display", "none");
                    return;
                  }
                }
                circle
                  .style("display", "block")
                  .attr("cx", pt[0])
                  .attr("cy", pt[1]);
              } else {
                circle.style("display", "none");
              }
            });
        }

        // Tooltip handling
        var tooltip = d3.select("body").select(".wcm-tooltip");

        function showTooltip(event, countryItem, feature) {
          var flag = countryItem ? countryItem.country.flag : "🌐";
          var name = countryItem ? countryItem.country.name : (feature.properties ? feature.properties.name : "Region");
          var continent = countryItem ? countryItem.country.continent.replace("_", " ").toUpperCase() : "";

          var content =
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
              '<span style="font-size:18px;">' + flag + '</span>' +
              '<div>' +
                '<div style="font-weight:700;font-size:13px;color:#1f2328;line-height:1.2;">' + name + '</div>' +
                (continent ? '<div style="font-size:9px;font-weight:600;letter-spacing:0.04em;color:#57606a;">' + continent + '</div>' : '') +
              '</div>' +
            '</div>';

          if (countryItem && countryItem.primaryValue > 0) {
            content +=
              '<div style="display:grid;grid-template-columns:auto auto;gap:4px 14px;border-top:1px solid #e1e4e8;padding-top:6px;margin-top:4px;">' +
                '<span style="color:#57606a;">' + (primaryMeas.label || primaryMeas.name) + ':</span>' +
                '<span style="font-weight:700;text-align:right;color:#1f2328;">' + (countryItem.renderedPrimary || formatMetric(countryItem.primaryValue)) + '</span>' +
                '<span style="color:#57606a;">Global Share:</span>' +
                '<span style="font-weight:600;text-align:right;color:' + theme.accent + ';">' + countryItem.sharePct.toFixed(1) + '%</span>' +
                '<span style="color:#57606a;">National Rank:</span>' +
                '<span style="font-weight:600;text-align:right;color:#24292f;">#' + countryItem.rank + ' of ' + countryList.length + '</span>' +
                (secondaryMeas && countryItem.secondaryValue > 0 ?
                  '<span style="color:#57606a;">' + (secondaryMeas.label || secondaryMeas.name) + ':</span>' +
                  '<span style="font-weight:700;text-align:right;color:' + bubbleColor + ';">' + formatMetric(countryItem.secondaryValue, true) + '</span>' : '') +
              '</div>';

            if (countryItem.links && countryItem.links.length > 0) {
              content += '<div style="margin-top:8px;padding-top:4px;border-top:1px dashed #e1e4e8;font-size:10px;font-weight:600;color:' + theme.accent + ';display:flex;align-items:center;gap:4px;">🔎 Click country to drill down</div>';
            }
          } else {
            content += '<div style="color:#57606a;font-size:11px;font-style:italic;margin-top:4px;">No data recorded for this region</div>';
          }

          tooltip
            .html(content)
            .style("visibility", "visible")
            .style("opacity", "1")
            .style("left", (event.pageX + 14) + "px")
            .style("top", (event.pageY - 28) + "px");
        }

        function moveTooltip(event) {
          tooltip
            .style("left", (event.pageX + 14) + "px")
            .style("top", (event.pageY - 28) + "px");
        }

        function hideTooltip() {
          tooltip.style("visibility", "hidden").style("opacity", "0");
        }

        // Country Mouse Events
        countryPaths
          .on("mouseover", function (event, d) {
            var id = String(d.id || (d.properties ? d.properties.name : ""));
            var dataItem = countryMap[id];

            d3.select(this)
              .attr("stroke", theme.accent)
              .attr("stroke-width", 1.8)
              .raise();

            if (bubblesGroup) bubblesGroup.raise();

            showTooltip(event, dataItem, d);
          })
          .on("mousemove", moveTooltip)
          .on("mouseout", function () {
            d3.select(this)
              .attr("stroke", showCountryBorders ? "#ffffff" : "none")
              .attr("stroke-width", 0.6);
            hideTooltip();
          })
          .on("click", function (event, d) {
            var id = String(d.id || (d.properties ? d.properties.name : ""));
            var dataItem = countryMap[id];
            if (dataItem && dataItem.links && dataItem.links.length > 0 && LookerCharts && LookerCharts.Utils) {
              LookerCharts.Utils.openDrillMenu({
                links: dataItem.links,
                event: event
              });
            }
          });

        // Bubble Mouse Events
        if (bubblesGroup) {
          bubblesGroup.selectAll("circle")
            .on("mouseover", function (event, d) {
              d3.select(this)
                .attr("stroke", "#1f2328")
                .attr("stroke-width", 2.2)
                .attr("fill-opacity", 1.0)
                .raise();

              showTooltip(event, d, { properties: { name: d.country.name } });
            })
            .on("mousemove", moveTooltip)
            .on("mouseout", function () {
              d3.select(this)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1.5)
                .attr("fill-opacity", 0.78);
              hideTooltip();
            })
            .on("click", function (event, d) {
              if (d && d.links && d.links.length > 0 && LookerCharts && LookerCharts.Utils) {
                LookerCharts.Utils.openDrillMenu({
                  links: d.links,
                  event: event
                });
              }
            });
        }

        // 5. Interactive Pan, Zoom & 3D Drag Rotation
        var zoom = d3.zoom()
          .scaleExtent([0.8, 12])
          .on("zoom", function (event) {
            self._currentZoomTransform = event.transform;
            mapG.attr("transform", event.transform);
          });

        if (layoutMode === "orthographic_globe") {
          // Spherical Drag Rotation
          var drag = d3.drag()
            .on("drag", function (event) {
              var r = projection.rotate();
              var k = 75 / projection.scale();
              projection.rotate([r[0] + event.dx * k, r[1] - event.dy * k]);
              mapG.selectAll("path").attr("d", path);
              updateBubblePositions();
            });
          svg.call(drag);

          // Auto-rotation loop
          if (globeAutoRotate) {
            self._rotationTimer = d3.timer(function () {
              var r = projection.rotate();
              projection.rotate([r[0] + 0.25, r[1]]);
              mapG.selectAll("path").attr("d", path);
              updateBubblePositions();
            });
          }
        } else {
          svg.call(zoom);
        }

        // 6. Floating Zoom Controls
        controls.innerHTML =
          '<button class="wcm-btn-zoom-in" title="Zoom in" style="width:28px;height:28px;background:#ffffff;border:1px solid #d0d7de;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#24292f;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.08);">+</button>' +
          '<button class="wcm-btn-zoom-out" title="Zoom out" style="width:28px;height:28px;background:#ffffff;border:1px solid #d0d7de;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:#24292f;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.08);">−</button>' +
          '<button class="wcm-btn-reset" title="Reset map view" style="width:28px;height:28px;background:#ffffff;border:1px solid #d0d7de;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#24292f;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.08);">⟲</button>';

        controls.querySelector(".wcm-btn-zoom-in").addEventListener("click", function () {
          if (layoutMode === "orthographic_globe") {
            projection.scale(projection.scale() * 1.3);
            mapG.selectAll("path").attr("d", path);
            updateBubblePositions();
          } else {
            svg.transition().duration(250).call(zoom.scaleBy, 1.3);
          }
        });

        controls.querySelector(".wcm-btn-zoom-out").addEventListener("click", function () {
          if (layoutMode === "orthographic_globe") {
            projection.scale(projection.scale() / 1.3);
            mapG.selectAll("path").attr("d", path);
            updateBubblePositions();
          } else {
            svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.3);
          }
        });

        controls.querySelector(".wcm-btn-reset").addEventListener("click", function () {
          if (layoutMode === "orthographic_globe") {
            projection.scale(initialScale).rotate([0, -15]);
            mapG.selectAll("path").attr("d", path);
            updateBubblePositions();
          } else {
            svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity);
          }
        });

        // 7. Render Color Ramp Legend (bottom left)
        if (primaryValues.length > 0) {
          var minFmt = formatMetric(d3.min(primaryValues));
          var maxFmt = formatMetric(d3.max(primaryValues));

          var rampSwatches = theme.ramp.map(function (color) {
            return '<div style="flex:1;height:8px;background:' + color + ';"></div>';
          }).join("");

          legend.innerHTML =
            '<div style="font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.04em;color:#57606a;margin-bottom:4px;">' + (primaryMeas.label || primaryMeas.name) + '</div>' +
            '<div style="display:flex;width:140px;border-radius:2px;overflow:hidden;border:1px solid #d0d7de;margin-bottom:3px;">' + rampSwatches + '</div>' +
            '<div style="display:flex;justify-content:space-between;width:140px;font-size:10px;color:#57606a;font-weight:600;">' +
              '<span>' + minFmt + '</span>' +
              '<span>' + maxFmt + '</span>' +
            '</div>';
        } else {
          legend.style.display = "none";
        }

        // Helper: Highlight country
        function highlightCountry(cid) {
          countryPaths.each(function (d) {
            var id = String(d.id || (d.properties ? d.properties.name : ""));
            var isTarget = id === cid || (COUNTRY_METADATA[id] && COUNTRY_METADATA[id].name.toLowerCase() === cid.toLowerCase());
            var pathEl = d3.select(this);

            if (isTarget) {
              pathEl
                .attr("stroke", "#d93025")
                .attr("stroke-width", 2.4)
                .attr("filter", "url(#wcm-glow)")
                .raise();

              if (layoutMode === "orthographic_globe") {
                var center = d3.geoCentroid(d);
                if (center) {
                  projection.rotate([-center[0], -center[1]]);
                  mapG.selectAll("path").attr("d", path);
                  updateBubblePositions();
                }
              }
            } else {
              pathEl
                .attr("stroke", showCountryBorders ? "#ffffff" : "none")
                .attr("stroke-width", 0.6)
                .attr("filter", null);
            }
          });
          if (bubblesGroup) bubblesGroup.raise();
        }

        // Helper: Apply Search Filter
        function applySearchHighlight(query) {
          if (!query) {
            countryPaths
              .attr("stroke", showCountryBorders ? "#ffffff" : "none")
              .attr("stroke-width", 0.6)
              .attr("filter", null)
              .attr("opacity", 1.0);
            return;
          }

          countryPaths.each(function (d) {
            var id = String(d.id || (d.properties ? d.properties.name : ""));
            var meta = COUNTRY_METADATA[id];
            var name = meta ? meta.name.toLowerCase() : "";
            var iso2 = meta ? meta.iso2.toLowerCase() : "";
            var iso3 = meta ? meta.iso3.toLowerCase() : "";
            var continent = meta ? meta.continent.toLowerCase() : "";

            var match = name.indexOf(query) !== -1 ||
                        iso2 === query ||
                        iso3 === query ||
                        continent.indexOf(query) !== -1;

            var p = d3.select(this);
            if (match) {
              p.attr("opacity", 1.0)
                .attr("stroke", "#ea4335")
                .attr("stroke-width", 2.0)
                .attr("filter", "url(#wcm-glow)")
                .raise();
            } else {
              p.attr("opacity", 0.35)
                .attr("stroke", showCountryBorders ? "#ffffff" : "none")
                .attr("stroke-width", 0.4)
                .attr("filter", null);
            }
          });
          if (bubblesGroup) bubblesGroup.raise();
        }

        // Apply search filter if present from before
        if (self._searchFilter) {
          applySearchHighlight(self._searchFilter);
        }

        if (typeof done === "function") done();
      }

      // Fetch or reuse TopoJSON
      if (cachedWorldData) {
        renderVisualization(cachedWorldData);
      } else {
        d3.json(WORLD_TOPOJSON_URL).then(function (world) {
          cachedWorldData = world;
          renderVisualization(world);
        }).catch(function (err) {
          element.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#d93025;font-size:13px;font-family:sans-serif;">Error loading TopoJSON world atlas: ' + err.message + '</div>';
          if (typeof done === "function") done();
        });
      }
    }
  });
})();
