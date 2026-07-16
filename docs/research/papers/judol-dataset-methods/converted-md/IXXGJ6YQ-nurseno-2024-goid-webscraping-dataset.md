Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer
Vol. 23,No. 2,March2024,pp. 365∼378
ISSN:2476-9843,accreditedbyKemenristekdikti,DecreeNo: 200/M/KPT/2020
DOI:10.30812/matrik.v23i2.3824 (cid:114) 365
Detecting Hidden Illegal Online Gambling on .go.id Domains Using
Web Scraping Algorithms
MuchlisNurseno1,UmarAditiawarman1,HarisAlQodriMaarif1,TeddyMantoro2
1UniversitasNusaPutra,Sukabumi,Indonesia
2UniversitasSampoerna,Jakarta,Indonesia
ArticleInfo ABSTRACT
Articlehistory: Theprofitablegamblingbusinesshasencouragedoperatorstopromoteonlinegamblingusingblack
hatSEObytargetingofficialsitessuchasgovernmentsites. Operatorshaveusedvarioustechniques
ReceivedJanuary25,2024
to prevent search engines from distinguishing between genuine and illegal content. This research
RevisedFebruary20,2024
aimstodeterminewhetherwebsiteswiththego.iddomainhavebeencompromisedwithhiddenURLs
AcceptedMarch01,2024
affiliated with online gambling sites. The method used in this research is an experiment using a
FOFA.infodatasetcontainingacompletelistof450,000.go.iddomains. Awebscrapingalgorithm
Keywords: developedinPythonwasusedtoidentifypotentiallycompromisedwebsitesfromthetargetedlistby
analyzinggambling-relatedkeywordsinlocallanguages,suchas’slot,’’judi,’’gacor,’and’togel’.The
BlackHatSEO
resultsshowedthat958ofthe1,482suspected.go.idsiteshadbeencompromisedwithanaccuracyrate
GovernmentWebsite
of99.1%.Thisimpliesthatsecuritygapshavebeenexploitedbyillegalonlinegamblingsites,posing
OnlineGambling
areputationalrisktothegovernment. Lastly,thescrappingalgorithmtooldevelopedinthisresearch
StealthyDefacement candetectillegalonlinegamblinghiddenindomainssuchas.ac.id,.or.id,.sch.id,andhelpauthorities
WebScraper takenecessaryaction.
Copyright(cid:13)c2024TheAuthors.
ThisisanopenaccessarticleundertheCCBY-SAlicense.
CorrespondingAuthor:
UmarAditiawarman,+6281383933673
DepartmentofComputerScience,
UniversitasNusaPutra,Sukabumi,Indonesia,
Email: umar.aditiawarman@nusaputra.ac.id
HowtoCite:
M.Nurseno,U.Aditiawarman,H.AlQodriMaarif,andT.Mantoro,”DetectingHiddenIllegalOnlineGamblingon.go.idDomains
Using Web Scraping Algorithms”, MATRIK : Jurnal Manajemen, Teknik Informatika dan Rekayasa Komputer, vol. 23, no. 2, pp.
365-378,Mar. 2024.
ThisisanopenaccessarticleundertheCCBY-SAlicense(https://creativecommons.org/licenses/by-sa/4.0/)
Journalhomepage: https://journal.universitasbumigora.ac.id/index.php/matrik

366 (cid:114) ISSN:2476-9843
1. INTRODUCTION
GamblingactivitiesofanyformonanyplatforminIndonesiaareprohibitedandsubjecttoInformationandElectronicTrans-
action(ITE)law. Toavoidthisrestriction,gamblingoperatorsemployblackhatSEOtechniquesandexploitthewebsite’sloophole
to promote online gambling activities [1, 2]. This classical method is still proven, boosts the popularity of online gambling and
games, and transcends global organized crimes that already affect society and the economy [3]. As a result, online gambling has
nowbecomecomplexandrequirescomprehensiveinterventionstomitigateitsadverseeffectsonsociety. AccordingtotheFinancial
TransactionReportsandAnalysisCenter(PPATK),thetotalofmoneycirculatingononlinegamblingin2023amountedtoRp327
trillionandrecorded168milliontransactions. Almost3,3millionindividualswereengagedinonlinegambling,andRp5trillionhas
beentransferred overseasbythe operators. BetweenJanuary1, 2022, andSeptember6, 2023, aconcerningtotal of9,052govern-
mentwebsiteswerefoundtohavebeeninfiltratedwithonlinegamblingcontent,promptinghowthegovernmentwebsiteswerebeing
managedandsecured. Insomecircumstances,thesesitesarehackedordefaced,andthewebmanagerisunaware,orthepagesare
nolongermaintained[4]. Despiteglobaleffortstocombatwebdefacementsrelatedtoillegalactivities,includingonlinegambling,
these remain elusive and challenging to eradicate [5]. This condition seriously threatens the foundational structure of government
digitalpresenceasitcompromisesthecredibilityoftheseserviceplatformsandraisessignificantcybersecurityrisks.
Althoughonlinegamblingactivitieshavecompromisedalotofofficialwebsites,researchfocusingontheinvestigationofhow
the crime is being organized and executed is scarce. Previous studies focused on detecting negative content within websites and
socialmedia[6]. MachinelearningalgorithmssuchasSVMandRandomForesthavebeenusedtodetectnegativecontent,including
pornography, fraud, and gambling materials [7, 8]. The result showed SVM is better than Random Forest in detecting negative
contentwithanaccuracyof97%, precisionof90%, andrecallof91%from526websitesunderinvestigation. However, detecting
negative content may not be sufficient to prevent such crimes from occurring again. Yang et al. [9] conducted a comprehensive
analysisofillegalonlinegamblingtargetingChineseusersanduncoveringitsprofitchain. Theyidentifiedover967,954suspicious
illegal gambling websites. They examined them across various dimensions, including webpage structure similarity, Search Engine
Optimization (SEO) methods, abuse of Internet infrastructure, third-party online payment, and gambling groups. Min et al. [10]
proposedtwoautomaticdetectionsystemsutilizingspamSMStoidentifyIllegalOnlineGambling(IOG)websites.Otherresearchers
proposeahybridmultimodaldatafusion-basedmethodforidentifyinggamblingwebsitesbyextractingandfusingvisualandsemantic
features of the website screenshots [11]. Wang et al. [12] propose a co-training-based gambling website identification method by
combining the visual and semantic features of the website screenshots. These studies essentially review the HTML structure and
processthetextinformationorURLswithintheHTMLforanalysis. Meanwhile,Liuetal. [13]introducedamethodfordetecting
web spam by extracting innovative feature sets from the homepage’s source code and employing the random forest algorithm as
the classifier. These feature sets include information extracted from the homepage’s links, HTML structure, and semantic content
similarity. Yang et al. [14] implemented a systematic approach to identifying and gathering infected web pages on a large scale,
usingkeywords,searchengineAPIs,andamachinelearningmodeltodifferentiatebetweeninfectedandnormalpages. Theirstudy
identified22,939infectedpagesacross2,563domainsanduncovered8,374newblacklistedkeywords,showcasinganefficientand
automatedsystemforextensivecollectionandclassification.
Recognizing the persistent issue of online gambling embedded on .go.id domains to bypass government restrictions and, in
some cases, to enhance search engine visibility, we proposed a customed web scraping tool equipped with criteria as discussed in
thepreviousresearch. OnlinegamblingpromotionsinIndonesiatypicallyleverageSEOtoattainrankingsonsearchengines. Unfor-
tunately,theyemployblackhatSEOtechniquesbyexploitingthepopularityof.go.idwebsites. TocounterblackhatSEO,various
detection approaches have been proposed. Web scrapers have been widespread and proven effective in solving various problems
[15, 16]. Constructed using Python programming, our web scraper tool is proven to identify concealed online gambling websites
withinwebpagecontent. Therefore,thisstudyaimstodeterminewhetherwebsiteswith.go.iddomainshavebeencompromisedwith
hiddenURLsaffiliatedwithonlinegamblingsites. Awebscrappertoolwasdevelopedtoeffectivelydetecthiddenonlinegambling
sitesbyexaminingtheHTMLstructures. Thisapproachwillenhancetheefficiencyofuncoveringhiddencontentbyextractingand
analyzingrelevantdatafromwebsites,offeringasystematicmeanstoidentifyandscrutinizepotentialonlinegamblingelementsthat
mightbeunknowinglyembeddedwithinthewebpages. ThePythoncodesforwebscrapingprovideaversatilesolutiontonavigate
throughthecomplexitiesofvariouswebsites,aidingintheidentificationandanalysisofconcealedonlinegamblingcontent.
ThealgorithmemployedinvolvesutilizingspecifickeywordstoidentifywebsitesorURLscontainingonlinegambling,which
arethenvalidatedtomeasuretheiraccuracy. Afterward,thecompiledlistofURLsisanalyzedtoassesstheextenttowhichhackers
have utilized .go.id domains to enhance the SEO of online gambling. Finally, this study aims to raise awareness among website
administrators and government networks in Indonesia about the critical importance of consistently safeguarding their assets and
remainingvigilantagainstcovertcyberthreats. Moreover,itaimstoshedlightonthepracticesofblackhatSEOwithinthecontext
ofonlinegamblingwebsitesinIndonesia.
Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer,
Vol. 23,No. 2,March2024: 365–378

Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer (cid:114) 367
This paper is structured by first highlighting the hidden illegal online gambling phenomenon within official websites and
how previous studies have encountered the issues. The gap is also identified, and the enhanced method is explained. The next
sectionelaboratesonthemethodusedtoexperiment. Thefindingsandanalysiswerediscussedinthethirdsection,followedbythe
conclusion.
2. RESEARCHMETHOD
Thisresearchemploysaquantitativeapproachbasedonanexperimentalmethodwherewebscrapingalgorithmsweredevel-
opedtodetecthiddenonlinegamblingURLsfromthe.go.iddomain. Inthisresearch, itisconceptualizedthatattackersengagein
websitedefacementtoinjectillegalcontent,suchashiddenillegalonlinegamblingsites,toboosttherankingorvisibilityofonline
gambling activities. The typical implementation of black hat SEO by online gambling operators on .go.id domains is depicted in
Figure1.
Figure1. BlackHatSEOofOnlineGamblingon.go.idDomain
Theprimarygoalofthisresearchistodevelopanovelapproach,namelyDESLOT(DetectingSlot),whichaimedatidentifying
potential instances of compromised websites with .go.id domains that hackers have exploited to increase the visibility and SEO of
online gambling sites so that they can promote their websites on search engines. To achieve this, we leverage the results obtained
fromGoogledorkqueries,whichfocusonwebsitesunderthe.go.iddomainandcontaintextorwordssimilarto’slot.’ Thismethod
allowsustolocatewebpagesthatmayhavebeendefacedtofacilitateillicitonlinegamblingpromotion. Thewebscraperdatawas
collectedbetweenOctober25to26,2023. TheresearchflowisdescribedinFigure2.
Figure2. ResearchFlow
2.1. VariableOperations
As part of our investigative process, we acquire a list of domain names that end with ”.go.id”. This list is then used to
systematicallyscrapethewebsitestodeterminetheircurrentstatuswithoutresortingtobruteforcedirectory,subdomaincrawling,or
visitinglinkswithintheHTMLcontent. Oncewehavedeterminedwhethereachwebsiteisactiveorinactive,wepaycloseattention
totheHTMLtagsoneachpage,specificallylookingforkeywordssuchas”slot,””judi,””gacor,”and”togel.”Bycarefullyinspecting
the HTML tags, we can identify instances where these keywords are used, which can provide valuable insights into the potential
presenceofgambling-relatedcontentthatwecanseeatFigure3. Ourobjectiveistoestablishacomprehensiveunderstandingofthe
currentstateof.go.iddomainsaboutgambling-relatedkeywords. Ourinvestigativeprocessisdesignedtoyieldaccurateandrelevant
findings,therebycontributingtoourinvestigation’soverallintegrityandeffectiveness.
DetectingHiddenIllegal...(MuchlisNurseno)

368 (cid:114) ISSN:2476-9843
Figure3. AffectedSitesbyBlackHatSEOTechniquesLinkedtoOnlineGamblingSites
2.2. TheDataset
Theprocessofwebscrapingstartsbyidentifyingatargetwebsiteoragroupofwebsitesfromwhichdataextractionisrequired.
For this purpose, FOFA.info emerges as a prominent data source for web scraping endeavors. The query ”host=’.go.id’” executed
onFOFA.infoproducesasignificantnumberofresults,approximately450,000recordsasofJuly27,2023. Subsequently,thedata
acquisitionprocesswasperformedusingtheAPIprovidedbyFOFA(https://en.fofa.info).Theacquireddataisthencarefullyindexed
andstoredinastructuredformat,specificallyCSV.Thiscomprehensivedataset,asshowninFigure4,includescrucialinformation
suchasIPaddresses,websitetitles,fulldomainnames,maindomainnames,andtherespectivecountriesassociatedwitheachdata
entry. From450,000domains,datacleaningwassubsequentlyconductedtoavoidduplicatesandirrelevantURLs,resultinginalist
of183,927websiteswiththe.go.iddomainforfurtheranalysis.
Table1. ExampleResultRetrievedfromFOFA
Link Domain IP ASNumber ASOrganization Country
dpk.pakpakbharatkab.go.id pakpakbharatkab.go.id 103.114.196.246 137353 DINASKOMINFOKABUPATEN ID
PAKPAKBHARAT
jogjaplaza.jogjaprov.go.id jogjaprov.go.id 103.255.15.68 59151 DiskominfoDIY ID
jbsc.jogjaprov.go.id jogjaprov.go.id 103.255.15.93 59151 DiskominfoDIY ID
bpttg.jogjaprov.go.id jogjaprov.go.id 103.255.15.97 59151 DiskominfoDIY ID
pn-batam.go.id pn-batam.go.id 198.204.249.98 33387 NOCIX US
mail.pa-surabaya.go.id pa-surabaya.go.id 66.70.176.59 16276 OVHSAS CA
The first step in the web scraping process involves consolidating the sorted full domain names into a single, comprehensive
text file in .txt format. This approach ensures the accuracy and integrity of the acquired dataset, which can then be systematically
scrapedforfurtheranalysis. Themeticulouspreprocessing,efficientdataorganization,andsystematicscrapinglaythegroundwork
forsuccessfuldataanalysis,allowingvaluableinsightsandmeaningfulconclusionstobeextractedfromtheoptimizeddataset.
2.3. DomainTestingTechniques
AsequentialscrapingalgorithmisdevelopedusingPythontotraversetheextensivelistofwebsites. Thisalgorithmcarefully
processes each entry from the .txt file and initiates the scraping process. Starting from the first domain in the list, the algorithm
systematicallyproceedstothenextone,ensuringthoroughcoverageofallwebsites. Importantaspectsofthetestingprocessinvolve
evaluatingtheconnectivityandresponsivenessofeachwebsite. ThePythonalgorithmcheckswhethereachdomainisaccessibleand
activewithina5-secondtimeframe(Figure5). ThefirstattempttoaccessasiteismadeusingtheHTTPSprotocol,andifitcannot
beaccessedwithin5seconds,itwillbetriedwiththeHTTPprotocolforanother5seconds. Thedomainisskippedifneitherhttps
norhttpcanbeaccessedwithin5seconds.
Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer,
Vol. 23,No. 2,March2024: 365–378

Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer (cid:114) 369
Figure4. WebConnectivityCheckMechanism
Inlinewithwebscraping, thePythonalgorithmconductsanin-depthcorrelationanalysisbetweenthecontentofwebpages
andspecifickeywordsofinterest,suchas’slot’,’judi’,gacor,and’togel.’Thisanalysishelpsidentifywhetherhackershaveinfiltrated
thesitetohideURLsortextrelatedtoonlinegambling. Afterthescrapingprocessofalldomainsiscompleted,thePythonalgorithm
verifiestheconsistencyandintegrityofthedataacrosstheobtaineddatasetsandtheactualwebcontent.Itperformscross-referencing
withtherecordedURLoutputandTitleattributestoensuretheyalignwiththeexpectedvalues. ThePythonalgorithmisequipped
withcomprehensiveerror-handlingmechanismstoaddressanypotentialissuesduringthescrapingprocess. Errorlogsandreports
detailinganychallengesencounteredenableresearcherstopromptlyidentifyandrectifyproblems,asseeninFigure5.
Figure5. LoggingProcess
In the provided Python code, the research testing techniques for web scraping are implemented to search for domains that
contain gambling-related keywords (’slot’, ’judi’, gacor, and ’togel’). The code uses the ’requests’ library for making HTTPS or
HTTPrequests towebsites, ’BeautifulSoup’from the’bs4’ libraryfor parsingthe HTMLcontent, ’concurrent.futures’ forparallel
processing,and’csv’forwritingtheresultstoaCSVfile.
In summary, The Python code demonstrates a research testing technique for web scraping to identify URLs containing
gambling-related keywords, which, when the code is executed, will produce output as shown in Figure 6. It leverages libraries
like’requests’and’BeautifulSoup’forefficientHTTPrequestsandHTMLparsing. Theuseof’concurrent.futures’ensuresparallel
processingofdomains,improvingtheoverallperformanceofthewebscrapingprocess. TheresultsarethensavedinaCSVfilefor
furtheranalysisandexploration.
DetectingHiddenIllegal...(MuchlisNurseno)

370 (cid:114) ISSN:2476-9843
Figure6. RealtimeDetectionAfterRunningPythonCode
2.4. DataAnalysisStrategy
Tomaintaindataaccuracy, websitessubjectedtowebscrapingundergofurthervalidationbasedontheirURLattributes. As
showninTable1below,awebsiteisdeemedInvalidifitlacksanyidentifiableURLorifthenumberofdiscoveredURLsislessthan
three(3)andincludestheterm’judi.’ Thisdeterminationispredicatedontheassumptionthatgovernmentwebsitestypicallyfeature
amaximumoftwo(2)newsarticlesorpostsrelatedtothesocializationofpreventionandlawenforcementcampaignsagainstonline
gambling. Conversely,websitesmeetingthesecriteriaareconsideredValid.
Table2. ValidationCriteria
Validation Description
ThereisaURLassociatedwithonlinegamblingcontent
Valid
Thereisatitlerelatedtothetermonlinegambling
ThereisnoURLortitleassociatedwithonlinegamblingcontent
Invalid
TheURLfoundleadstonewsaboutonlinegamblinganditsprevention. Usually,itconsistsoflessthan
threeurls.Apartfromthat,theURLispositive
The validation process plays a pivotal role in assessing the application’s efficacy in identifying websites concealing URLs
associated with online gambling. The validation process was also conducted to gauge its accuracy, as can be seen in Figure 7.
Subsequently, the validated data undergoes meticulous scrutiny to delve into the realm of black hat SEO practices employed by
onlinegamblingwebsitesoperatingunderthe.go.iddomain.
Figure7. ValidationProcess
Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer,
Vol. 23,No. 2,March2024: 365–378

Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer (cid:114) 371
In cases where URLs are not provided, the code proceeds to validate the Title (Figure 8). It dissects the title into individual
words for examination and employs regular expressions to search for specific keywords, such as ’slot’, ’judi’, gacor, and ’togel’
while excluding the word ajudikasi. If any of these keywords are detected in the title, the code deems the website as ”Valid.” In
situationswheretheURLsmeetthecriteriaforvalidity,butthetitledoesnot,thedomainisstillconsidered”Valid.”Indetermining
this validation, we employ reverse logic by first identifying rows of data with invalid values and subsequently examining the valid
ones.
Figure8. ValidationusingPythonCode
AscanbeseeninFigure9,forexample,theinvalidresultinthethirdcolumn(URLsection)meetsthefollowingcriteria: the
URLisempty,thetitle(secondcolumn)isunrelatedtoonlinegambling,andlessthanthreeURLsarecontainingthekeyword’judi’.
Thechoiceofthekeyword’judi’forinvalidresultsisbecause, basedonobservation, cybercriminalsattempttoevadedetectionby
KominfoandwebsiteadministratorsbyusingalternativetermsintheirURLs,suchas’slot,’’gacor,’andothers.
Figure9. InvalidResults(UncompromisedWebsites)
Meanwhile,validexamplescanbeseeninFigure10below,whichshowsseveralURLsrelatedtoonlinegamblingwithinthe
HTMLbodyofthetargetwebsite.
Figure10. ValidResults(CompromisedWebsites)
DetectingHiddenIllegal...(MuchlisNurseno)

372 (cid:114) ISSN:2476-9843
Byupholdingstringentvalidationcriteria, thisresearchendeavorstoensurethedataset’sintegrity. Thevalidationprocessis
instrumental in distinguishing between valid and invalid websites, illuminating the application’s proficiency in detecting websites
concealing URLs associated with online gambling. Following the completion of this accuracy assessment, the validated dataset
becomesthefocalpointforanin-depthexaminationoftheblackhatSEOtechniquesemployedbyonlinegamblingwebsiteswithin
the.go.iddomain.
Thevaliddataisthenanalyzedinthe”URL”attribute,withtheinitialseparationofwebsitesunderthe.go.iddomain. Thisis
donetoenhancethevisibilityof.go.iddomainsiteshighlylikelytohavebeencompromisedorutilizedforblackhatSEOpractices
relatedtoonlinegambling.Subsequently,these.go.iddomainwebsitesaredesignatedaslabelstobecross-referencedwiththeresults
fromFOFA.infotoascertainsiteidentities, suchastheIPaddressesused. Thisallowsustoassumethatifthereare.go.iddomain
siteswiththesameIPaddress,thereisasignificantlikelihoodthatthewebserverofthosesiteshasbeencompromised.
3. RESULTANDANALYSIS
From the 183,927 unique websites subjected to web scraping, 1,482 were found to contain keywords such as ’slot,’ ’judi,’
’gacor,’or’togel.’ However,atthisstage,itcannotbedefinitivelyascertainedwhetherthesekeywordsindicateinfectionwithinthese
sites. FollowingtheimplementationofthePythonalgorithm,970ofthesewebsiteswerecategorizedaspositiveorvalid,ofwhich
12 were false positives (FP) and 512 negatives, with 1 being a false negative (FN). Consequently, the count of true positives (TP)
amountedto958,andtruenegatives(TN)reached511. Inthiscase,theaccuracystandsatapproximately99.1%. Theaccuracyof
detectingwebsitespotentiallyrelatedtoonlinegamblingiscalculatedusingEquation(1).
TP +TN
Accuracy = ×100 (1)
TP +TN +FP +FN
The seamless integration of URL and title validation in the algorithm enhances its capability to discern between valid and
invalidwebsitesaccurately. Incorporatingspecifickeywordsinthe’Title’segment, indicativeofpotentialonlinegamblingcontent
oractivities,furtheraugmentsthesystem’sefficacyinidentifyingwebsitesassociatedwithonlinegambling. Thisadvancedmethod-
ologysignificantlyimprovestheoverallaccuracyandreliabilityofthealgorithm’sassessments,establishingitasavaluabletoolfor
detectingconcealedonlinegambling-relatedcontent.
Concurrently, our observations reveal a noteworthy pattern where several websites are interconnected with numerous URLs
linked to online gambling. These websites strategically embed online gambling URLs using specific HTML code to bolster their
visibility and search engine optimization (SEO). Employing techniques such as transparency, hidden attributes, or matching text
color to the background, these websites exemplify the prevalence of black hat SEO strategies in the Indonesian online landscape,
particularlyfocusingonutilizing.go.iddomainstomasktheirillicitactivities. Thesewebsitesexhibitaclearintenttoenhancethe
visibilityandSEOofonlinegamblingsitesandunveilacomplexnetworkofinterconnecteddomains,suggestingacoordinatedeffort
toexploitcompromised.go.idwebsitesforthispurpose.
TheseidentifiedwebsitesfunctionasconduitstoboosttheratingsandSEOofwebsitesassociatedwithonlinegambling,often
operatingcovertlyundertheguiseoflegitimate.go.iddomains. EmployingsophisticatedHTMLcodingtechniquestoobscureonline
gambling-relatedURLs, thesewebsitesmakethemnearlyimperceptibletocasualvisitors. Moreover, asignificantinterconnection
isobservedbetweenthesewebsitesandother.go.iddomains,indicatingpotentialcompromisesthroughthecreationofnewpathsor
directoriestoenhancetheratingsandSEOofonlinegambling-relatedwebsites. Notably,someofthesewebsitesevenprovidelinks
toforeignonlinegamblingsites. ThestatisticaldatarelatedtothisresearchcanbefoundinTable2.
Table3. SummaryofProcessedWebsites
Information Count
Processed.go.idWebsitesonWebScraper 183.927
WebsiteDetectedbyKeyword 1.482
TruePositive 958
URLReferringtoOnlineGambling 6.437
.go.idURLReferringtoOnlineGambling 1.514
Thefindingsfromsortingdomainsexposedtoonlinegambling-relatedhackingandscrutinizingrecordedURLssuggestthat
approximately1,500.go.idwebsitesareimplicatedastoolsemployedbycybercriminalstoboostrankingsorpromoteonlinegam-
Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer,
Vol. 23,No. 2,March2024: 365–378

Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer (cid:114) 373
blingsites. Amongthesediscoveries, numeroussuspicious.go.idsubdomains, suchasslot777.sumbawabaratkab.go.id, rtp-slot.pa-
sungailiat.go.id,slot-pulsa.pa-sungailiat.go.id,slot-maxwin.pa-sungailiat.go.id,slot-toto.sukabumikab.go.id,slot.sumbawabaratkab.go.id,
etc.,directingtothepromotionofonlinegamblingsites,furtherindicatethecreationofnewsubdomainsbymaliciousactorstoevade
governmentrestrictions.
Figure11. WordcloudofAllURLsrelatedtoOnlineGamblingSites
TheobtaineddatawassubsequentlyprocessedusingPythoncodeforwordcloudanalysis,theresultsofwhichcanbeseenin
Figure11;itcanbeinferredthatURLsrelatedtoOnlineGamblingpredominantlyincludekeywordssuchasgo.id,ac.id,slotserver,
id slot, gacor slot, org, and others. The presence of ”ac.id” indicates that efforts to embed online gambling sites are not limited to
”.go.id” sites but also extend to sites owned by educational institutions. Additionally, various countries are mentioned, indicating
themaspotentiallocationsforserversofonlinegamblingsitesabroad,suchasThailand,Russia,HongKong,Vietnam,Cambodia,
andtheUnitedStates.
Figure12. Wordcloudof.go.idURLRelatedtoOnlineGamblingSites
DetectingHiddenIllegal...(MuchlisNurseno)

374 (cid:114) ISSN:2476-9843
Simultaneously,theexaminationofthewordcloudgeneratedfrom”.go.id”domainURLsrevealstheheightenedvisibilityof
websitesassociatedwithlocalgovernmententities,asseeninFigure12,suggestingapotentialcompromiseofthesesites. Notably,
theprevalenceofkeywordssuchas”slot”withinthewordcloudindicatestheestablishmentofnewsubdomainsleveragingcompro-
mised primary domains owned by government entities. Moreover, the observed interconnectivity among these websites and other
.go.iddomainsraisesconcerns, hintingattheexistenceofapotentialnetworkofcompromisedwebsitesoperatingwithinthesame
domainspace. Theactivitiesofthisnetworkpromptinquiriesintothesecurityandintegrityof.go.iddomains,necessitatingfurther
investigationintotheextentofinfiltration.Theamalgamationoftheidentified1,500websiteswassubsequentlycross-referencedwith
dataobtainedfromFOFA.infotoconfirmthatthewebsitesinfiltratedbyillegalonlinegamblingsitesindeedconstitutedsubdomains
ofalarger.go.iddomain. Additionally,itwasnotedthatseveralofthesesubdomainssharedthesameIPaddressblock,implyingthe
likelihoodthatthevirtualmachines(VM)and/orservershostingthesesubdomainshadbeencompromised.
Figure13. Wordcloudof.go.idURLRelatedtoOnlineGamblingSites
This discovery unveils a concerning pattern of illicit activity within the .go.id domain space, as the interconnection among
subdomainsandsharedIPaddresses,asseeninFigure13,impliesanetworkofcompromisedwebsites,raisingalarmsaboutpotential
breaches in the security and integrity of the .go.id domain infrastructure. This necessitates a pressing call for a comprehensive
investigationtoascertainthefullextentofthisinfiltration. Furtherscrutinyisimperativetocomprehendthemethodsandmotivations
of cybercriminals utilizing these subdomains to boost rankings and promote illegal online gambling sites. Concurrently, efforts
should be directed towards fortifying security measures and enhancing the integrity of .go.id domains to prevent future breaches
andsafeguardtheonlineecosystemfromsuchmaliciousactivities. Inconclusion,ourobservationsrevealacovertnetworkoperating
withinthe.go.iddomainspace,discreetlyelevatingtheratingsandSEOofonlinegambling-relatedwebsitesthroughconcealedURLs.
Advanced HTML coding techniques underscore the prevalence of black hat SEO practices in Indonesia. The broader implications
of this operation, including the interconnected compromised .go.id domains and links to foreign online gambling sites, necessitate
acomprehensiveinvestigationintothesecurityandregulatoryaspectsofonlineactivitieswithinthecountryandattheinternational
level.
Understanding the significance of these hidden links involves recognizing their role as a form of backlink manipulation. In
search engine optimization (SEO), backlinks are essential elements contributing to a website’s authority and visibility in search
Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer,
Vol. 23,No. 2,March2024: 365–378

Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer (cid:114) 375
results. Abacklinkisessentiallyahyperlinkfromonewebsitetoanother,actingasavoteofconfidenceorrecommendation. Whena
websitewithastrongreputationandrelevanceprovidesabacklinktoanothersite,itcanpositivelyimpactthelatter’ssearchengine
rankings.
Aftergoingthroughthisprocess,wehaverealizedthatthealgorithmwehavedevelopedencounterscertainlimitationswhen
parsing text within HTML due to the diverse nature of text formats used by malicious actors. They utilize a variety of text types
beyond the commonly used UTF-8, which necessitates additional encoding procedures. As a result, this limitation leads to the
exclusionofcertainURLsreferringtoonlinegamblingwebsites. Moreover,ouralgorithmmaystillhaveshortcomingsinthecontext
ofsearchengineindexing,consideringthatthelanguageassociatedwithonlinegamblingactivitiesisinaconstantstateofevolution,
withnewkeywordsemergingsuchas”toto,””zeus,””4D,”andothers.Nonetheless,thekeywordsweemployareconsideredadequate
forindicatingthepresenceofconcealedactivitiesbymaliciousactorsintheirendeavorstoboostonlinegamblingrankings.
In summary, the findings raise the need for industries, regulators, and cybersecurity experts to collaboratively address the
multifaceted challenges posed by the evolving landscape of cyber threats within the Indonesian online sphere. These findings also
promptcrucialrecommendationstomitigatetherisksassociatedwithblackhatSEOpracticesandbolsterthesecurityandintegrity
of online domains. These recommendations encompass various measures, including the development of advanced web scraping
or web crawling tools capable of handling diverse text formats, fostering collaborative efforts among stakeholders, establishing
clear legal frameworks, implementing continuous monitoring and evaluation mechanisms, and promoting the adoption of robust
cybersecuritybestpracticesbywebsiteownersandadministrators. Additionally,conductingregularsecurityassessments,ensuring
timely software updates, enforcing strong password policies, and implementing network segmentation to shield websites against
potentialthreatsisessential. Removingunusedsubdomainsfromwebsitesisalsoimperative,asneglectingsupervisionoverinactive
subdomainscancreateavenuesforattacks.It’scrucialtorememberthatthemoredoorsleftopen,thehighertheriskofvulnerabilities
beingexploitedbymaliciousactors. Moreover,sensitiveinformationabouttheserver,suchasSSH,FTP,anddatabasecredentials,
should not be disclosed to unauthorized individuals or publicly. Administrators can also implement measures to address online
gambling web defacement incidents by referring to documents published by the National Cyber and Encryption Agency (BSSN).
Proactively safeguarding websites is key to reducing the risk of falling victim to IP address compromises and strengthening the
overallcybersecurityposture. Understandingthemodusoperandioftheseentitiesisessentialfordevisingeffectivecountermeasures
tocombattheiractivitiesandenhancethesecurityoftheonlineenvironment. Inpractice, onlinegamblingoperatorsswiftlycreate
andmodifywebsitesandmechanisms,posingasignificantchallengeforlawenforcement,particularlythePolice,whendealingwith
casesrelatedtoonlinegambling[17–19].
4. CONCLUSION
WiththeDESLOTmodel,wecanidentify.go.iddomainsitesthathavebeeninfiltratedbyhiddenURLsforonlinegambling
promotion. However, there are still some false positives in their execution. The strategic enhancement of our algorithm, achieved
through collaborative efforts, included the integration of an additional layer of automated validation. This meticulous analysis of
HTMLstructurescontainingURLsassociatedwithonlinegamblingplayedacrucialroleinrefiningtheprecisionofouralgorithm.
Employingatwo-foldapproach,ouralgorithmscrutinizestheentireHTMLcontentandintensifiesitsanalysisontheURLsegment.
The results reveal that 958 .go.id websites are compromised out of 1,482 suspected websites and provide 99.1% accuracy. After
that,wedelveddeeperintothedarkerrecessesoftheIndonesianonlinelandscape,revealingthewidespreaduseofadvancedHTML
codingtechniquesandsheddinglightonblackhatSEOpracticeswithin”.go.id”domains. Theinterconnecteddomainsobservedin
ourstudyhighlightedacoordinatedefforttoexploitcompromised”.go.id”websites,raisingseriousconcernsaboutthesecurityand
integrityofthesedomains. Thestrategicinsertionofhiddenlinkswithinonlinegamblingwebsitesemergedasapivotaldiscovery,
underscoringtheurgentnecessityforvigilanceincounteringsuchtactics.
Inadditionto.go.iddomains,numerousotherdomainswarrantinvestigation. However,analyzing.go.iddomainsoffersvalu-
able insights into how black hat SEO for online gambling operates in Indonesia without detection. For example, domains such as
.ac.id, .or.id, and .sch.id, which are suspected of having been extensively infiltrated by hackers to promote online gambling, also
requirecomprehensivescrutiny. Furtherresearchinthisfieldcanshedlightontheevolvingtacticsandtechniquesemployedbycy-
bercriminalsinthecontextofonlinegamblingandserveasabasisfordevelopingmorerobustwebscrapingorcrawlingalgorithms
capableofhandlingdiversetextformats.
DetectingHiddenIllegal...(MuchlisNurseno)

376 (cid:114) ISSN:2476-9843
5. ACKNOWLEDGEMENTS
The authors would like to thank everyone who contributed to this work until it was published, especially the anonymous
reviewers,thechiefeditors,andtheMatrik: JurnalManajemen,TeknikInformatikadanRekayasaKomputer.
6. DECLARATIONS
AUTHORCONTIBUTION
The first and second authors are responsible for the simulations and write-up, the third author advised the framework and method
usedinthestudy,andthefourthandfifthauthorsareresponsiblefortheformattinganddesignofthepaper.
FUNDINGSTATEMENT
Thisresearchreceivednospecificgrantfromanyfundingagencyinthepublic,commercial,ornot-for-profitsectors.
COMPETINGINTEREST
Theauthorshavenocompetingfinancial,professional,orpersonalinterests.
REFERENCES
[1] H. Yang, K. Du, Y. Zhang, S. Hao, H. Wang, J. Zhang, and H. Duan, “Mingling of Clear and Muddy
Water: Understanding and Detecting Semantic Confusion in Blackhat SEO,” in Computer Security ESORICS
2021. Springer, Cham, 2021, pp. 263–284, https://doi.org/10.1007/978-3-030-88418-5 13. [Online]. Available: https:
//link.springer.com/chapter/10.1007/978-3-030-88418-5 13
[2] S. Vaishy and H. Gupta, “Cybercriminals’ Motivations for Targeting Government Organizations,” in 2021 9th
International Conference on Reliability, Infocom Technologies and Optimization (Trends and Future Directions) (ICRITO).
Noida, India: IEEE, Sep. 2021, pp. 1–6, https://doi.org/10.1109/ICRITO51393.2021.9596104. [Online]. Available:
https://ieeexplore.ieee.org/document/9596104/
[3] S. Setiawati, Pratiwi Ayu Sri Daulat, Sunarto, and SumartiniDewi, “The Urgency of Special Regulations for online
Gambling in Indonesia,” International Journal of Arts and Social Science, vol. 5, no. 7, pp. 108–115, Mar. 2023,
https://doi.org/10.5281/ZENODO.7754860.[Online].Available: https://zenodo.org/record/7754860
[4] M. Albalawi, R. Aloufi, N. Alamrani, N. Albalawi, A. Aljaedi, and A. R. Alharbi, “Website Defacement Detection and
MonitoringMethods:AReview,”Electronics,vol.11,no.21,p.3573,Nov.2022,https://doi.org/10.3390/electronics11213573.
[Online].Available: https://www.mdpi.com/2079-9292/11/21/3573
[5] R.Zhao,“TheChameleonontheWeb: anEmpiricalStudyoftheInsidiousProactiveWebDefacements,”inProceedingsofthe
ACM Web Conference 2023. Austin TX USA: ACM, Apr. 2023, pp. 2241–2251, https://doi.org/10.1145/3543507.3583377.
[Online].Available: https://dl.acm.org/doi/10.1145/3543507.3583377
[6] A. Arora, P. Nakov, M. Hardalov, S. M. Sarwar, V. Nayak, Y. Dinkov, D. Zlatkova, K. Dent, A. Bhatawdekar, G. Bouchard,
and I. Augenstein, “Detecting Harmful Content on Online Platforms: What Platforms Need vs. Where Research Efforts
Go,” ACM Computing Surveys, vol. 56, no. 3, pp. 1–17, Mar. 2024, https://doi.org/10.1145/3603399. [Online]. Available:
https://dl.acm.org/doi/10.1145/3603399
[7] H.SyahputraandA.Wibowo,“ComparisonofSupportVectorMachine(SVM)andRandomForestAlgorithmforDetectionof
NegativeContentonWebsites,”JurnalIlmiahTeknikElektroKomputerdanInformatika(JITEKI),vol.9,no.1,pp.165–173,
Mar.2023,https://doi.org/10.26555/jiteki.v9i1.25861.
[8] Y. Chen, R. Zheng, A. Zhou, S. Liao, and L. Liu, “Automatic Detection of Pornographic and Gambling Websites
Based on Visual and Textual Content Using a Decision Mechanism,” Sensors, vol. 20, no. 14, p. 3989, Jul. 2020,
https://doi.org/10.3390/s20143989.[Online].Available: https://www.mdpi.com/1424-8220/20/14/3989
[9] H. Yang, K. Du, Y. Zhang, S. Hao, Z. Li, M. Liu, H. Wang, H. Duan, Y. Shi, X. Su, G. Liu, Z. Geng, and J. Wu, “Casino
royale: a deep exploration of illegal online gambling,” in Proceedings of the 35th Annual Computer Security Applications
Conference. SanJuanPuertoRicoUSA:ACM,Dec.2019,pp.500–513,https://doi.org/10.1145/3359789.3359817.[Online].
Available: https://dl.acm.org/doi/10.1145/3359789.3359817
Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer,
Vol. 23,No. 2,March2024: 365–378

Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer (cid:114) 377
[10] M. Min, J. J. Lee, and K. Lee, “Detecting Illegal Online Gambling (IOG) Services in the Mobile Environment,” Security
and Communication Networks, vol. 2022, pp. 1–12, Feb. 2022, https://doi.org/10.1155/2022/3286623. [Online]. Available:
https://www.hindawi.com/journals/scn/2022/3286623/
[11] C. Wang, M. Zhang, F. Shi, P. Xue, and Y. Li, “A Hybrid Multimodal Data Fusion-Based Method for Identifying Gambling
Websites,” Electronics, vol.11, no.16, p.2489, Aug.2022, https://doi.org/10.3390/electronics11162489.[Online].Available:
https://www.mdpi.com/2079-9292/11/16/2489
[12] C. Wang, P. Xue, M. Zhang, and M. Hu, “Identifying Gambling Websites with Co-training,” Jul. 2022, pp. 598–603,
https://doi.org/10.18293/SEKE2022-106.[Online].Available: http://ksiresearchorg.ipage.com/seke/seke22paper/paper106.pdf
[13] J. Liu, Y. Su, S. Lv, and C. Huang, “Detecting Web Spam Based on Novel Features from Web Page Source Code,” Security
and Communication Networks, vol. 2020, pp. 1–14, Dec. 2020, https://doi.org/10.1155/2020/6662166. [Online]. Available:
https://www.hindawi.com/journals/scn/2020/6662166/
[14] R. Yang, J. Liu, L. Gu, and Y. Chen, “Search & Catch: Detecting Promotion Infection in the Underground through Search
Engines,” in 2020 IEEE 19th International Conference on Trust, Security and Privacy in Computing and Communications
(TrustCom). Guangzhou, China: IEEE, Dec. 2020, pp. 1566–1571, https://doi.org/10.1109/TrustCom50675.2020.00216.
[Online].Available: https://ieeexplore.ieee.org/document/9343210/
[15] J.Schedlbauer,G.Raptis,andB.Ludwig,“Medicalinformaticslabormarketanalysisusingwebcrawling,webscraping,and
textmining,”InternationalJournalofMedicalInformatics,vol.150,p.104453,Jun.2021,https://doi.org/10.1016/j.ijmedinf.
2021.104453.[Online].Available: https://linkinghub.elsevier.com/retrieve/pii/S1386505621000794
[16] J.-C. Bricongne, B. Meunier, and S. Pouget, “Web-scraping housing prices in real-time: The Covid-19 crisis in the UK,”
JournalofHousingEconomics,vol.59,p.101906,Mar.2023,https://doi.org/10.1016/j.jhe.2022.101906.[Online].Available:
https://linkinghub.elsevier.com/retrieve/pii/S105113772200078X
[17] E.S.Hasibuan,“ThePoliceareIndecisive: OnlineGamblingisRising.FactsabouttheEradicationofOnlineGamblinginthe
Field,” Journal of Social Research, vol. 2, no. 10, Aug. 2023, https://doi.org/10.55324/josr.v2i10.1405. [Online]. Available:
https://ijsr.internationaljournallabs.com/index.php/ijsr/article/view/1405
[18] E. C. Listiyanto and A. Arpangi, “Implementation Effectiveness of Police Role in Eradication of Online Gaming Crime in
Digital Era,” Law Development Journal, vol. 3, no. 2, p. 362, Aug. 2021, https://doi.org/10.30659/ldj.3.2.362-370. [Online].
Available: http://jurnal.unissula.ac.id/index.php/ldj/article/view/16072
[19] M. Senjaya, “Law Enforcement of the Crime of Money Laundering That Comes from Online Gambling,” International
JournalofSocialScience,vol.2,no.3,pp.1641–1650,Oct.2022,https://doi.org/10.53625/ijss.v2i3.3626.[Online].Available:
https://bajangjournal.com/index.php/IJSS/article/view/3626
DetectingHiddenIllegal...(MuchlisNurseno)

(cid:114)
378 ISSN:2476-9843
[Thispageintentionallyleftblank.]
Matrik: JurnalManajemen,TeknikInformatika,danRekayasaKomputer,
| Vol. 23,No. | 2,March2024: | 365–378 |
| ----------- | ------------ | ------- |