// Adaptado de cinco páginas de apuntes de clase. Las fotos originales no se publican.
export const topics = {
  basics: ['Energía y corriente', 'Energia eta korrontea'],
  ohm: ['Ley de Ohm', 'Ohmen legea'],
  plants: ['Centrales eléctricas', 'Zentral elektrikoak'],
  grid: ['Transporte eléctrico', 'Elektrizitatearen garraioa'],
  home: ['Instalación de casa', 'Etxeko instalazioa'],
  safety: ['Riesgos', 'Arriskuak']
};
// Cada entrada sirve como tarjeta y pregunta, con su respuesta en ambos idiomas.
export const cards = [
  ['energy','basics','¿Qué es la energía?','Zer da energia?','La capacidad de producir cambios y realizar trabajo.','Aldaketak sortzeko eta lana egiteko ahalmena.'],
  ['source','basics','¿Qué es una fuente de energía?','Zer da energia-iturri bat?','Un recurso del que podemos obtener energía.','Energia lortzeko erabil dezakegun baliabidea.'],
  ['electricity','basics','¿Qué es la electricidad?','Zer da elektrizitatea?','Un conjunto de fenómenos relacionados con las cargas eléctricas.','Karga elektrikoekin lotutako fenomenoen multzoa.'],
  ['current','basics','¿Qué es la corriente eléctrica?','Zer da korronte elektrikoa?','El movimiento ordenado de cargas eléctricas; en metales, de electrones.','Karga elektrikoen mugimendu ordenatua; metaletan, elektroiena.'],
  ['dc','basics','¿Qué es la corriente continua?','Zer da korronte jarraitua?','La corriente que circula siempre en el mismo sentido.','Beti noranzko berean dabilen korrontea.'],
  ['ac','basics','¿Qué es la corriente alterna?','Zer da korronte alternoa?','La corriente que cambia de sentido periódicamente.','Noranzkoa aldizka aldatzen duen korrontea.'],
  ['circuit','basics','¿Qué necesita un circuito para que circule corriente?','Zer behar du zirkuituak korrontea ibiltzeko?','Un camino cerrado y una fuente que mantenga una diferencia de potencial.','Ibilbide itxia eta potentzial-diferentzia mantentzen duen iturria.'],
  ['electrical-energy','basics','¿Qué permite hacer la energía eléctrica?','Zer egiteko aukera ematen du energia elektrikoak?','Realizar trabajo mediante fenómenos eléctricos.','Fenomeno elektrikoen bidez lana egitea.'],
  ['voltage','ohm','¿Qué representa V en la ley de Ohm?','Zer adierazten du V-k Ohmen legean?','La tensión, medida en voltios (V).','Tentsioa, voltetan (V) neurtua.'],
  ['intensity','ohm','¿Qué representa I en la ley de Ohm?','Zer adierazten du I-k Ohmen legean?','La intensidad de corriente, medida en amperios (A).','Korrontearen intentsitatea, amperetan (A) neurtua.'],
  ['resistance','ohm','¿Qué representa R en la ley de Ohm?','Zer adierazten du R-k Ohmen legean?','La resistencia, medida en ohmios (Ω).','Erresistentzia, ohmetan (Ω) neurtua.'],
  ['formula-v','ohm','¿Cómo se calcula la tensión con la ley de Ohm?','Nola kalkulatzen da tentsioa Ohmen legearekin?','V = I × R','V = I × R'],
  ['formula-i','ohm','¿Cómo se calcula la intensidad con la ley de Ohm?','Nola kalkulatzen da intentsitatea Ohmen legearekin?','I = V / R','I = V / R'],
  ['formula-r','ohm','¿Cómo se calcula la resistencia con la ley de Ohm?','Nola kalkulatzen da erresistentzia Ohmen legearekin?','R = V / I','R = V / I'],
  ['calc-v','ohm','Si I = 2 A y R = 6 Ω, ¿cuánto vale V?','I = 2 A eta R = 6 Ω badira, zenbat da V?','12 V. Porque V = 2 × 6.','12 V. V = 2 × 6 delako.'],
  ['calc-i','ohm','Si V = 12 V y R = 4 Ω, ¿cuánto vale I?','V = 12 V eta R = 4 Ω badira, zenbat da I?','3 A. Porque I = 12 / 4.','3 A. I = 12 / 4 delako.'],
  ['calc-r','ohm','Si V = 10 V e I = 2 A, ¿cuánto vale R?','V = 10 V eta I = 2 A badira, zenbat da R?','5 Ω. Porque R = 10 / 2.','5 Ω. R = 10 / 2 delako.'],
  ['hydro','plants','¿Qué utiliza una central hidráulica?','Zer erabiltzen du zentral hidraulikoak?','El movimiento del agua para generar electricidad.','Uraren mugimendua elektrizitatea sortzeko.'],
  ['wind','plants','¿Qué utiliza una central eólica?','Zer erabiltzen du zentral eolikoak?','El movimiento del viento para generar electricidad.','Haizearen mugimendua elektrizitatea sortzeko.'],
  ['solar-thermal','plants','¿Cómo funciona una central solar térmica?','Nola funtzionatzen du eguzki-zentral termikoak?','Usa el calor del Sol para producir vapor y generar electricidad.','Eguzkiaren beroa erabiltzen du lurruna eta elektrizitatea sortzeko.'],
  ['solar-pv','plants','¿Cómo funciona una central fotovoltaica?','Nola funtzionatzen du zentral fotovoltaikoak?','Sus células convierten la luz solar directamente en electricidad.','Bere zelulek eguzki-argia zuzenean elektrizitate bihurtzen dute.'],
  ['thermal','plants','¿Cómo funciona una central térmica de combustión?','Nola funtzionatzen du errekuntza-zentral termikoak?','Quema combustible para producir calor, vapor y electricidad.','Erregaia erretzen du beroa, lurruna eta elektrizitatea sortzeko.'],
  ['nuclear','plants','¿Qué aprovecha una central nuclear?','Zer baliatzen du zentral nuklearrak?','El calor de reacciones nucleares para generar electricidad.','Erreakzio nuklearren beroa elektrizitatea sortzeko.'],
  ['generation','grid','¿Dónde se genera electricidad a gran escala?','Non sortzen da elektrizitatea eskala handian?','En las centrales eléctricas.','Zentral elektrikoetan.'],
  ['step-up','grid','¿Qué hace el transformador antes del transporte?','Zer egiten du transformadoreak garraioaren aurretik?','Eleva la tensión para reducir las pérdidas durante el transporte.','Tentsioa igotzen du garraioan galerak gutxitzeko.'],
  ['lines','grid','¿Cómo se transporta la electricidad a larga distancia?','Nola garraiatzen da elektrizitatea distantzia luzeetara?','Por líneas eléctricas con cables conductores metálicos.','Metalezko kable eroaleak dituzten linea elektrikoen bidez.'],
  ['substation','grid','¿Qué hace una subestación de distribución?','Zer egiten du banaketa-azpiestazioak?','Reduce la tensión para distribuir electricidad hacia los usuarios.','Tentsioa jaisten du elektrizitatea erabiltzaileengana banatzeko.'],
  ['order','grid','¿Qué orden resume el transporte eléctrico?','Zein ordenak laburbiltzen du garraio elektrikoa?','Central → transformador elevador → líneas → subestación.','Zentrala → transformadore igoarazlea → lineak → azpiestazioa.'],
  ['distribution','home','¿Qué es la red de distribución de baja tensión?','Zer da tentsio baxuko banaketa-sarea?','Los cables que llevan electricidad desde el transformador a los edificios.','Transformadoretik eraikinetara elektrizitatea eramaten duten kableak.'],
  ['connection','home','¿Qué es la acometida (hartunea)?','Zer da hartunea?','La conexión entre la red de distribución y el edificio.','Banaketa-sarearen eta eraikinaren arteko konexioa.'],
  ['protection','home','¿Para qué sirve la caja general de protección?','Zertarako da babes-kutxa orokorra?','Para alojar elementos que protegen la instalación eléctrica.','Instalazio elektrikoa babesten duten elementuak gordetzeko.'],
  ['link','home','¿Qué une la línea general de alimentación?','Zer lotzen du elikadura-linea orokorrak?','La caja general de protección con la centralización de contadores.','Babes-kutxa orokorra kontagailuen zentralizazioarekin.'],
  ['meters','home','¿Qué se mide con el contador eléctrico?','Zer neurtzen du kontagailu elektrikoak?','La energía eléctrica consumida por la vivienda.','Etxebizitzak kontsumitutako energia elektrikoa.'],
  ['individual','home','¿Qué conecta una derivación individual?','Zer lotzen du banakako adarrak?','El contador con la instalación de cada vivienda.','Kontagailua etxebizitza bakoitzaren instalazioarekin.'],
  ['burns','safety','¿Qué daño puede causar la electricidad en la piel?','Zer kalte eragin dezake elektrizitateak azalean?','Quemaduras graves.','Erredura larriak.'],
  ['heart','safety','¿Qué riesgo tiene la corriente al atravesar el cuerpo?','Zer arrisku dago korrontea gorputzetik igarotzean?','Puede alterar el corazón, causar asfixia y ser mortal.','Bihotza kaltetu, itomena eragin eta hilgarria izan daiteke.']
].map(([id,topic,qes,qeu,aes,aeu]) => ({id,topic,q:[qes,qeu],a:[aes,aeu]}));

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function optionsFor(card) {
  const distractors = {
    'formula-v': ['V = I / R', 'V = I + R', 'V = R / I'],
    'formula-i': ['I = V × R', 'I = R / V', 'I = V + R'],
    'formula-r': ['R = V × I', 'R = I / V', 'R = V + I'],
    'calc-v': ['8 V', '3 V', '0,33 V'],
    'calc-i': ['48 A', '8 A', '0,33 A'],
    'calc-r': ['20 Ω', '8 Ω', '0,2 Ω'],
    burns: [
      ['Solo puede enfriar la piel.', 'Azala hoztu besterik ezin du egin.'],
      ['No puede dañar la piel.', 'Ezin du azala kaltetu.'],
      ['Solo afecta a los cables.', 'Kableei bakarrik eragiten die.']
    ],
    heart: [
      ['Solo es peligrosa si se ve una chispa.', 'Txinparta ikusten bada bakarrik da arriskutsua.'],
      ['Nunca afecta al corazón.', 'Ez dio inoiz bihotzari eragiten.'],
      ['Solo produce molestias leves.', 'Eragozpen arinak besterik ez ditu sortzen.']
    ]
  };
  if (distractors[card.id]) return shuffle([card, ...distractors[card.id].map((a,i) => ({id:`${card.id}-wrong-${i}`,a:Array.isArray(a)?a:[a,a]}))]);
  let others = cards.filter(c => c.id !== card.id && c.topic === card.topic);
  if (others.length < 3) others = cards.filter(c => c.id !== card.id);
  return shuffle([card, ...shuffle(others).slice(0,3)]);
}
