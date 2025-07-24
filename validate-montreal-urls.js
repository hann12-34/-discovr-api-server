const axios = require('axios');
const fs = require('fs');

// Montreal URLs from your list
const rawUrls = `
atwater-cocktail-club.ca
aubergedumontroyal.ca
barbie-expo.ca
barpalco.ca
bartitomtl.ca
belvederecamillien-houde.ca
biodome-montreal.ca
boho.ca
cabinetbar.ca
cafecleopatre.com
canal-lachine-viewpoint.ca
carrierewellington.ca
centrepompidou.ca
chalet-de-la-montagne.ca
chateau-ramezay-gardens.ca
cloakroombar.ca
clocktower-beach.ca
coldroom.ca
elsmalldublin.ca
esconditerestaurant.ca
fleurylechaud.ca
gokudo.ca
insectarium-montreal.ca
jardin-botanique-montreal.ca
jardinhelen.ca
kondiaronk-belvedere.ca
lacachette.ca
lavoûte.ca
lecomptoirchicmtl.ca
lelab.ca
lhumainmtl.ca
mcgillunderground.ca
mcgilluniversitycampus.ca
milkywaymtl.ca
montrealmirrorpavilion.ca
montrealsciencecentre.ca
mount-royal-lookout.ca
mtlzipline.ca
muralesfestivalmtl.ca
notre-dame-des-neiges.ca
notredamesecrets.ca
oratoiremontreal.ca
parcjeandrapeau-biosphere.ca
parclagfontaine.ca
parcmontroyal.ca
pierredumauierpark.ca
placedarts.ca
placevillemarie-observatory.ca
planetarium-montreal.ca
pointe-a-calliere.ca
quartierdespectacles.ca
redpathmuseum.ca
steamupunkbar.ca
studiotheatres.ca
theblackeyemtl.ca
themidwaymtl.ca
thepastime.ca
undergroundcity.ca
vieux-port-clock-tower.ca
vieuxmontreal-overlook.ca
raquette-montroyal.ca
igloofest-activites.ca
feteglacemontreal.ca
patinoire-angrignon.ca
plage-polaire-montreal.ca
musee-collection-pompiers.ca
centre-dhistoire-montreal.ca
musee-holocauste-montreal.ca
musee-chateau-ramezay.ca
musee-grevesmontreal.ca
ecomusee-du-fier-monde.ca
musee-redpath.ca
musee-femme-mtl.ca
musee-bank-montreal.ca
musee-d'art-juif.ca
museedespossibles.ca
musee-ferroviaire-canadien.ca
musee-mode-costumes.ca
musee-hotel-de-ville.ca
maisonnotman.ca
musee-canadien-architecture.ca
maison-saint-gabriel.ca
museemontrealimpression.ca
musee-militairemontreal.ca
maisonbernandsinger.ca
lola-rosa.ca
invitation-v.ca
panthere-verte.ca
aux-vivres.ca
chucho.ca
sushi-momo.ca
antidote-cuisine-vege.ca
le-nil-bleu.ca
chu-chai.ca
omna-restaurant.ca
lov-restaurant.ca
cafe-dei-campi.ca
restaurant-lotus-bleu.ca
green-panther.ca
resto-vego.ca
bonnys-vege.ca
le-cagibi.ca
picnictorievegetarien.ca
la-lumiere-du-mile-end.ca
vegetarienthaichezchay.ca
pubsirjoseph.ca
mckibbins-irish-pub.ca
irish-embassy.ca
hurley-irishpub.ca
brutopia.ca
pubstpatrick.ca
taverne-gaspar.ca
burgundylion.ca
pubgambrinusmtl.ca
taverne-square-dominion.ca
publepoincu.ca
wolf-workman.ca
taverne-normand.ca
pubsaintpierre.ca
pubmccarold.ca
aumaistrechasseur.ca
tavernemidway.ca
pubmontreal1234.ca
districtpubmontreal.ca
ye-olde-orchard.ca
circuit-brassicole-mtl.ca
routedesbieres.ca
experiencebiere.ca
montrealcraftbeertour.ca
tourbieremtl.ca
microbrasseriesquartiers.ca
pubcrawlmtl.ca
biereartisanalemtl.ca
tourismebrassicole.ca
routehoublon.ca
circuitbrasseriesmtl.ca
degustationbieres.ca
brasserieslocales.ca
tourbrasseriesmontreal.ca
routedelabiere.ca
tournee-brassicole.ca
brewtours-mtl.ca
biereartisanale-circuitmtl.ca
amateursdebieredemontreal.ca
microboutiquesdebieres.ca
mile-end-fashion.ca
crescent-street-style.ca
la-gauchetiere-fashion.ca
saint-denis-design.ca
laurier-ouest-boutiques.ca
canal-design.ca
griffintown-habillement.ca
avenue-mont-royal-mode.ca
district-griffintown-mode.ca
rue-saint-paul-boutiques.ca
boul-saint-laurent-mode.ca
rue-laurier-est-boutiques.ca
vieux-montreal-design.ca
simons-montreal.ca
chabanel-district.ca
rue-bernard-boutiques.ca
village-mode.ca
mcgill-college-mode.ca
avenue-cartier-habillement.ca
saint-viateur-mode.ca
ateliers-angus.ca
cercle-carre.ca
zocalo-ateliers.ca
belgo-artistes.ca
atelierscanonnier.ca
espace-creatif-montreal.ca
district-artisanal.ca
ateliers-mile-end.ca
artisans-du-plateau.ca
artisanat-mtl.ca
ateliers-hochelaga.ca
collectif-artisanal-mtl.ca
ateliers-griffintown.ca
ateliers-saint-viateur.ca
artisans-rosemont.ca
coop-atelier.ca
atelierscirculaires.ca
artisansdelapierre.ca
ateliercommunautaire.ca
studio-artisanal-mile-ex.ca
jardins-communautaire.ca
agriculture-urbaine-mtl.ca
santropol-roulant.ca
jardins-villeray.ca
lufa-fermes.ca
fermiere-urbaine.ca
serre-hochelaga.ca
verdissement-rosemont.ca
collectif-agriculture.ca
jardinsmile-end.ca
cultiver-montreal.ca
serresurbanesmontreal.ca
jardinssurletoits.ca
eco-quartier-mtl.ca
terreaux-urbains.ca
ferme-urbaine-bordeaux.ca
potagerusine.ca
jardinsmontreal.ca
serremtl.ca
agricultureurbainemtl.ca
piste-cyclable-lachine.ca
route-verte-montreal.ca
piste-berge-du-canal.ca
circuit-ile-notre-dame.ca
reseau-cyclable-montreal.ca
velo-tour-mtl.ca
piste-maisonneuve.ca
circuit-velo-saint-laurent.ca
reseau-velo-mont-royal.ca
piste-cyclable-rachel.ca
circuit-boyer.ca
velo-promenade-bellerive.ca
piste-maisonneuve-viau.ca
circuit-cyclable-plateau.ca
velobergevieux-port.ca
circuit-cyclable-rosemont.ca
piste-christophe-colomb.ca
parcours-velo-camelienne.ca
reseaucyclablemtl.ca
pistenordmtl.ca
cosmodome-laval.ca
centrelavalfantasia.ca
skylventures-laval.ca
maeva-surf.ca
lasalleintrique-laval.ca
arbraska-laval.ca
centrenature-laval.ca
macval-art-centre.ca
theatremarcellinechampagne.ca
parcodelile-laval.ca
musee-armand-frappier.ca
centrelaurendeau.ca
plageideale-laval.ca
espacemultifonctionnel-laval.ca
carrefourlaval-entertainment.ca
centreville-laval.ca
parc-berge-aux-quatre-vents.ca
parclestemeraires.ca
saintedorothee-marina.ca
centremuseologie-laval.ca
oldportofmontreal.com
montroyal.ca
notredamebasilica.ca
biospheremontreal.ca
biodome-montreal.ca
saint-joseph-oratory.ca
mtl-biodome.ca
montrealsciencecentre.com
lagranderouedemontreal.com
olympic-park-montreal.ca
parc-jean-drapeau.ca
espacepourlavie.ca
montrealbotanicalgarden.ca
larondeamusementpark.com
vieuxmontreal.ca
placedesarts.com
pointeacalliere.ca
chateauramezay.ca
mccord-museum.ca
montrealjazzfestival.com
newcitygas.com
stereobar.ca
lavoute.ca
muziquemontreal.ca
lerougebar.ca
blvd44.com
clubunity.com
complexesky.com
foufounes.ca
belmont.ca
cabaretmado.com
club1234.ca
lebalcon.ca
lebelmont.ca
bsbmontreal.com
montrealnightclubs.com
larockette.ca
newauspeak.ca
barvinemontreal.ca
leyokokuna.com
coldroom.ca
atwater-cocktail-club.ca
cloakroombar.ca
biginbig.com
blackeyemontreal.com
theritzbar.com
lelab.com
baronvonbar.com
barlecomptoir.com
lemalnecessaire.com
barraca.ca
flyjin.ca
barpalco.ca
pubdaome.com
bartito.ca
gokudoizakaya.com
elmalmontreal.com
mayfaircocktailbar.com
barbossa.ca
barfurco.com
dieuduciel.com
benelux.ca
amereaboire.com
harricana.ca
mabrasserie.com
boswell-brasserie.com
lesaintbock.com
pubepitaphe.com
brutopia.net
lebaroq.ca
brasseriemcauslan.ca
barhurley.com
brasseriedumonde.ca
lepourquoipas.ca
mcgibbinspub.ca
pubsaintpierre.ca
yeoldeorchard.com
troisbrasseurs.com
detnorsketaverne.com
griffintown.com
`;

async function validateUrls() {
    console.log('🚀 Starting Montreal URL validation...\n');
    
    // Extract URLs from the raw text
    const urls = rawUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0 && !url.startsWith('//') && !url.includes('MONTREAL'))
        .map(url => url.replace(/\s+/g, ''));
    
    console.log(`📊 Found ${urls.length} URLs to process`);
    
    // Remove duplicates
    const uniqueUrls = [...new Set(urls)];
    console.log(`🔄 Removed ${urls.length - uniqueUrls.length} duplicates`);
    console.log(`📋 Processing ${uniqueUrls.length} unique URLs\n`);
    
    const activeUrls = [];
    const inactiveUrls = [];
    const errorUrls = [];
    
    // Test each URL
    for (let i = 0; i < uniqueUrls.length; i++) {
        const url = uniqueUrls[i];
        const progress = ((i + 1) / uniqueUrls.length * 100).toFixed(1);
        
        try {
            // Add protocol if missing
            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
            
            process.stdout.write(`\r🔍 Testing [${progress}%] ${url}...`);
            
            const response = await axios.get(fullUrl, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; URL-Validator/1.0)'
                }
            });
            
            if (response.status === 200) {
                activeUrls.push(url);
                process.stdout.write(` ✅`);
            } else {
                inactiveUrls.push(url);
                process.stdout.write(` ❌`);
            }
            
        } catch (error) {
            if (error.response) {
                // Server responded with an error
                if (error.response.status === 404) {
                    inactiveUrls.push(url);
                    process.stdout.write(` ❌ (404)`);
                } else {
                    errorUrls.push(`${url} (${error.response.status})`);
                    process.stdout.write(` ⚠️  (${error.response.status})`);
                }
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                inactiveUrls.push(url);
                process.stdout.write(` ❌ (${error.code})`);
            } else {
                errorUrls.push(`${url} (${error.code || 'Unknown error'})`);
                process.stdout.write(` ⚠️  (${error.code || 'Error'})`);
            }
        }
        
        // Small delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n\n🎉 Montreal URL validation complete!\n');
    
    // Summary
    console.log('📊 SUMMARY:');
    console.log(`✅ Active URLs: ${activeUrls.length}`);
    console.log(`❌ Inactive URLs: ${inactiveUrls.length}`);
    console.log(`⚠️  Error URLs: ${errorUrls.length}`);
    console.log(`📋 Total processed: ${uniqueUrls.length}\n`);
    
    // Write results to files
    fs.writeFileSync('montreal-urls-active.txt', activeUrls.join('\n'));
    fs.writeFileSync('montreal-urls-inactive.txt', inactiveUrls.join('\n'));
    fs.writeFileSync('montreal-urls-errors.txt', errorUrls.join('\n'));
    
    console.log('📁 Files created:');
    console.log('  ✅ montreal-urls-active.txt');
    console.log('  ❌ montreal-urls-inactive.txt');
    console.log('  ⚠️  montreal-urls-errors.txt');
    
    // Show some examples
    console.log('\n🔍 Active URLs sample:');
    activeUrls.slice(0, 10).forEach(url => {
        console.log(`  ✅ ${url}`);
    });
    
    console.log('\n❌ Inactive URLs sample:');
    inactiveUrls.slice(0, 10).forEach(url => {
        console.log(`  ❌ ${url}`);
    });
}

validateUrls().catch(console.error);
