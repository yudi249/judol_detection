ProceedingPaper
Performance Analysis of IndoBERT for Detection of Online
†
Gambling Promotion in YouTube Comments
KamdanKamdan* ,MalikPajarAnugrah ,MohJeliAlmutaali,RestuRamdaniandIvanaLuciaKharisma
FacultyofEngineering,ComputerandDesign,NusaPutraUniversity,Sukabumi43152,Indonesia;
malik.pajar_ti22@nusaputra.ac.id(M.P.A.);moh.jeli_ti22@nusaputra.ac.id(M.J.A.);
restu.ramdani_ti22@nusaputra.ac.id(R.R.);ivana.lucia@nusaputra.ac.id(I.L.K.)
* Correspondence:kamdan@nusaputra.ac.id
† Presentedatthe7thInternationalGlobalConferenceSeriesonICTIntegrationinTechnicalEducation&
SmartSociety,AizuwakamatsuCity,Japan,20–26January2025.
Abstract
The proliferation of online gambling promotions on social media platforms, particularly
YouTube,posesasignificantchallengeindigitalsecurityandregulation. Thisstudyevalu‑
atestheperformanceofIndoBERTindetectingonlinegambling‑relatedspaminYouTube
comments. The research utilizes YouTube Data API to collect comments, preprocess the
text through cleaning and tokenization, and fine‑tune IndoBERT for classification. The
model’sperformanceisassessedusingaccuracy,precision,recall,andF1‑scoremetrics. In‑
doBERTachievesoutstandingresultswithanaccuracyof98.26%,provingitseffectiveness
indetectingonlinegamblingpromotion. Theconfusionmatrixanalysishighlightsalow
errorrate,withminimalfalsepositivesandfalsenegatives. IndoBERTisapromisingtool
forcombatingonlinegamblingspam,offeringhighreliabilityforautomatedcontentmod‑
eration. Future improvements should focus on handling implicit promotional language,
enhancingdatasetdiversity,andintegratingrule‑basedfiltering. Thisstudycontributesto
NLPadvancementsinIndonesiantextclassification,supportingeffortstomaintainasafer
digitalenvironment.
Keywords:IndoBERT;onlinegamblingpromotiondetection;YouTubecomments;Natural
LanguageProcessing(NLP)
AcademicEditors:DebopriyoRoy,
GeorgeF.FragulisandPeterIlic
Published:2September2025 1. Introduction
Citation: Kamdan,K.;Anugrah, Because of its detrimental effects on many facets of society, the promotion of on‑
M.P.;Almutaali,M.J.;Ramdani,R.;
line gambling on digital platforms, particularly YouTube, has grown in concern. Tech‑
Kharisma,I.L.PerformanceAnalysis
nologicaldevelopmentshavemadeonlinegamblingmoreaccessible,whichhasincreased
ofIndoBERTforDetectionofOnline
userengagementandraisedthedangerofaddictionandmonetarylosses[1,2]. Research
GamblingPromotioninYouTube
Comments.Eng.Proc.2025,107,66. showsthatinternetgamblingsitessignificantlyimpactmentalhealth,especiallyinadoles‑
https://doi.org/10.3390/ cence[1]. EventhoughinternetgamblingisillegalinIndonesia, therearestillanumber
engproc2025107066 ofobstaclestoovercomebeforeanti‑gamblinglawscanbeputintoplace[2]. Furthermore,
Copyright:©2025bytheauthors. thelegalsystemisstilldevelopingwaystohandlecrimesinvolvinginternetgamblingand
LicenseeMDPI,Basel,Switzerland. theeffectstheyhaveonsociety[3]. Onestudyfoundthat54.2%ofusers’educationalneeds
Thisarticleisanopenaccessarticle about gambling risks originate from media content addressing this topic, demonstrating
distributedunderthetermsand
the critical role the media plays in educating the public about the risks associated with
conditionsoftheCreativeCommons
onlinegambling[4].
Attribution(CCBY)license
Thenumerousdetrimentaleffectsofonlinegamblingincludeaddiction,strainedfam‑
(https://creativecommons.org/
licenses/by/4.0/). ily relationships, reduced productivity at work, and an increased risk of criminal activ‑
Eng.Proc.2025,107,66 https://doi.org/10.3390/engproc2025107066

Eng.Proc.2025,107,66 2of17
ity [5,6]. The main reasons why people gamble online are the need for rapid cash gains,
convenient access, and ignorance of the risks involved. Furthermore, according to [6,7],
internetgamblingisclassifiedasatypeofcybercrimethatdefiesbothlegalandreligious
standards. Publicawarenesscampaigns,lawenforcementcapacitybuilding,andlegaled‑
ucation are some of the measures taken to regulate this phenomenon [5,6,8]. In order to
properlysolvethisissue,cooperationbetweencommunities,corporations,andthegovern‑
mentisessential[6].
Promoters’useofcolloquialisms,slang,andcrypticverbiagetoavoidautomaticiden‑
tification is one of the biggest obstacles to identifying online gambling promotions. Ac‑
cordingtorecentresearch,theTF–IDFalgorithmandRandomForestworkwelltogether
to detect gambling‑related content on Twitter [9]. However, text‑based detection algo‑
rithmscontinuetohavedifficultieswhenitcomestotheusageofnon‑standardlanguage,
acronyms,andsymbolsinonlinegamblingadvertisements[10]. Promotersfrequentlyem‑
ploycapitalletters,quotationmarks,andabbreviationstogetpastautomaticfilteringsys‑
tems, according to another study that examined the structure of SMS‑based online gam‑
blingads[11]. Furthermore, acomparisonofgamblingpromotionlawsinothernations
shows that, even with Indonesia’s stringent laws against online gambling, there are still
manybarrierstotheirimplementation[2].
Natural language processing (NLP)‑based artificial intelligence models, like Indo‑
BERT,offerapromisingwaytoovercometheseobstacles. Inanumberofnaturallanguage
processingtasks,theIndonesian‑languagemodelIndoBERThasshownexceptionalperfor‑
mance[12]. WhencomparedtopreviousBERTmodelslikeIndoRoBERTaandmBERT,this
modelhasdemonstratedsuperioraccuracyindomainsliketextcategorization,sentiment
analysis,andquestion‑answeringsystems[13]. Althoughthereisstillopportunityforad‑
vancement through more sophisticated information retrieval approaches, IndoBERT has
alsobeendemonstratedtobeeffectiveinprocessingdomain‑specificlanguage[14]. With
more than 700 regional languages in use, linguistic diversity is one of Indonesia’s NLP
problems,whichmakesthecreationofNLPmodelsmoredifficult[15].
According to recent research, BERT‑based models have been effectively used in In‑
donesia for a variety of text classification tasks. For electric vehicles, IndoBERT demon‑
strated great accuracy in sentiment analysis and spam message detection (98%) [16,17].
IndoBERToutperformedothermodelswithanF1scoreof0.8897intheanalysisofharm‑
fulcommentsonIndonesiansocialmedia[18]. Inthemeantime,IndoBERTweetobtained
an F1‑score of 0.89, a precision of 0.85, and a recall of 0.94 for the multi‑label categoriza‑
tion of online toxic contents [19]. These results demonstrate the significant potential of
BERT‑based models, such as IndoBERT, in identifying online gambling promotions and
improvingdigitalsecurityinIndonesia.
ThepurposeofthisstudyistoassessIndoBERT’seffectivenessinidentifyingonline
gamblingpromotionsinYouTubecommentareas. AnAI‑basedmethodisrequiredtoiden‑
tifylanguagetrendsinonlinegamblingadssinceYouTubeisincreasinglybeingutilized
asasecretplatformforgamblingmarketing. TheusefulnessofIndoBERTinthisdetection
jobwillbeexaminedinthisstudy,withparticularattentionpaidtoevaluationmeasures,
includingaccuracy,precision,andrecall,andthedifficultiesinspottinghiddenlanguage
employedbyonlinegamblingmarketers.
2. LiteratureReview
Theuseoftransformermodelsanddeeplearningtoidentifyharmfulinformationin
varioussituationshasbeeninvestigatedinanumberofresearcharticles. Whenitcomes
toidentifyingspamreviews,transformer‑basedmodelshaveoutperformedconventional
deeplearningtechniques;RoBERTaachievedthemaximumaccuracyof90.8%[20]. Trans‑

Eng.Proc.2025,107,66 3of17
formermodelshavealsodemonstratedsuperiorperformanceincyberbullyingidentifica‑
tionwhencomparedtomachinelearninganddeeplearningtechniques;usingBanglaand
Chittagoniantexts,XLMRoBERTaachievedanaccuracyof84.1%[21]. Transformermod‑
elshadthehighestaccuracyof98.49%onYouTubedata,accordingtoanotherstudythat
comparedtransformer,deeplearning,andmachinelearningmodelsincyberbullyingde‑
tection [22]. On the basis of internet news, transformer models have also been used to
identify changes in the stock market. The accuracy of indoBERT‑large and multilingual‑
BERT,respectively,was88.60%and95.90%[23]. Theseexperimentsdemonstratehowwell
transformermodelsidentifydistincttypesofhazardouscontentinavarietyoflanguages
anddisciplines.
Recent developments in natural language processing (NLP) have shown a lot of
promiseinsolvingproblemslikefraudpreventionandinternettoxicityidentification. In
order to improve internet safety, showed how well a refined IndoBERTweet model clas‑
sified harmful content in Indonesian [24]. Investigated NLP techniques for examining
fraudulentactionsandpresentedFraudNLP,apubliclyavailabledatasetforonlinefraud
detection[25]. However,emphasizedtheneedformoreresilientmodelsforpracticalap‑
plicationsbypointingouthowsusceptibleNLPsystemsaretohostileattacks[26]. Theuse
ofnaturallanguageprocessing(NLP)inmodel‑to‑modeltransformationwasinvestigated
by [27], who compared several tools for tasks including phrase extraction and abbrevia‑
tionidentification. ThesestudiesdemonstratehowNLPmaybeusedtoaddressdifficult
linguistic problems, but they also point to the need for more robust and flexible models
thatcanbeappliedtoavarietyofdomains.
Recent developments in natural language processing (NLP) models have demon‑
stratedencouragingoutcomesinarangeofIndonesiantextclassificationproblems. With
greaterprecision,recall,andF1‑scores,IndoBERTweethassurpassedIndonesianRoBERTa
in identifying online toxicity [24]. On the IndoNLU dataset (Ahmadian et al., 2024), a
hybrid model that combined IndoBERT with BiLSTM, BiGRU, and attention processes
obtained 78% accuracy in emotion classification and 93% accuracy in sentiment analy‑
sis [28]. With an accuracy range of 75–84.79% across many datasets, DeceptiveBERT, a
transfer learning‑based model based on pre‑trained BERT, was able to identify decep‑
tive reviews [29]. In domain‑specific tasks, IndoGovBERT, a BERT‑based model trained
onIndonesiangovernmentdocuments,outperformedgenerallanguagemodelsandnon‑
transformer approaches in processing texts related to Sustainable Development Goals
(SDG)[30]. Theseexperimentsdemonstratehowwelltransformer‑basedmodelsperform
inproblemsinvolvingtheclassificationofIndonesiantext.
The use of BERT‑based models for different NLP tasks in both English and Indone‑
sian has been investigatedin a number of papers. IndoBERTweet outperformed Indone‑
sian RoBERTa in identifying and classifying online toxicity in Indonesian [24]. On the
IndoNLUdataset[31],presentedahybridmodelthatcombinedIndoBERTwithBiLSTM,
BiGRU,andattentionprocesses,attaining78%accuracyinemotionclassificationand93%
accuracyinsentimentanalysis[28]. DeceptiveBERT,atransformer‑basedmodelforiden‑
tifyingdeceptivereviewsonsocialmedia,waspresentedinEnglishby[29]. Itachievedan
accuracyrangeof75–84.79%acrossmanydatasets. TheseworksshowhowBERT‑based
modelscanbeusedtosolvearangeoflinguisticproblems,suchassentimentanalysis,tox‑
icitydetection,andtherecognitionofdeceptivetext. Thisstudyintendstofillaresearch
gapasnostudyhasexplicitlyexaminedtheapplicationofIndoBERTforidentifyingonline
gamblingpromotionsonsocialmedia.

Eng.Proc.2025,107,66 4of17
3. ResearchMethod
3.1. ResearchFramework
The research framework describes the steps needed to use IndoBERT to find online
gambling advertising in YouTube comments. The procedure starts with gathering data
frompubliclyaccessiblefilmsusingtheYouTubeDataAPIv3toextractcomments,which
are subsequently saved in CSV format. The next step in the preparation procedure is to
clean the text by deleting special characters, changing all of the letters to lowercase, tok‑
enizing the text with the IndoBERT tokenizer, and deleting unnecessary common terms.
After that, the comments are manually classified as either non‑spam or spam (gambling
promotions)asafirstlabelingphase.
Themodelistrainedusing80%ofthedatasetfortrainingand20%fortesting,with
hyperparameter tuning applied to optimize learning rate, batch size, and the number of
epochs. Afterthemodelistrained,itsperformanceisassessedusingaccuracy,precision,
recall, and F1‑score metrics. The evaluation results show that IndoBERT achieves high
accuracy in detecting spam comments related to gambling promotions. IndoBERT was
selectedforthemodelselectionandtrainingstageduetoitsstrongabilitytounderstand
theIndonesianlanguage.
Anerroranalysisisthencarriedouttodeterminethedifficultiesthemodelhaswhile
identifyingcovertorimplicitgamingpromotions. Anumberofenhancementtechniques
are suggested, such as enlarging the dataset to encompass a wider variety of linguistic
variants,usingrule‑basedfilteringtomanagecertainlinguisticpatterns,andconsistently
upgradingthemodeltoaccommodatechanginglinguistictrends. Lastly,thebuiltmodel
hasbeenreleasedtoHuggingFace,makingitavailabletoacademicsanddevelopers,and
isusedinanautomatedmoderationsystemforYouTubecommentstoweedoutspam.
TheoverallprocessofthisstudyisillustratedinFigure1,whichpresentstheresearch
framework. Thecolorsinthefigureareusedtodistinguishthedifferentphases,namely:
data phase, model phase, analysis phase, and deploy phase. It outlines the sequential
stages, startingfromdatacollectionthroughtheYouTubeDataAPI,followedbyprepro‑
cessing,modeltraining,evaluation,anddeployment.
Figure1.Researchframework.

Eng.Proc.2025,107,66 5of17
3.2. DataCollectionfromYouTubeComments
TheYouTubeDataAPIversionthreewasusedtoacquirethedataforthisinvestigation.
ThemethodusedattemptstoautomaticallyextractcommentsfromYouTubevideosthat
areaccessibletothepublic. Thefirststepinthisprocedureistofindoutifcommentsare
available on the videos that are the subject of the investigation. To verify this the total
numberofcommentsisobtainedfromthevideostatisticsprovidedinthevideometadata,
thetotalnumberofcommentsshowninthevideostatisticsisretrieved. Thedatacollecting
procedurecontinuesiftherearecommentsonthevideo.
Tocreatearepresentativedatasetthatisneverthelessmanageable,commentsarethen
fully retrieved, while a maximum data retrieval limit is specified. Important details like
videoidentification,username(ifaccessible),commentcontent,publicationtime,andthe
quantityoflikesearnedbytheremarkareallincludedineveryproperlyrecoveredcom‑
ment. Afterthat,theacquireddataaresavedinCSVformat,whichmakesdataadminis‑
trationeasierandallowsforseamlessfurtheranalysis.
ThepriorresearchhasdemonstratedthatgatheringinformationfromYouTubecom‑
mentsisanessentialfirststepinidentifyingandcategorizingspam. Inordertodetectspam
commentsinpopularmusicvideos,employedacomment‑gatheringtechnique[32]. This
allowedfortheemploymentofseveralmachinelearningalgorithmsforadditionalanaly‑
sis. Furthermore, a new dataset for identifying abusive language in YouTube comments
was created by [33], emphasizing the significance of thorough data collection that incor‑
poratesconversationalcontexttoincreaseclassificationaccuracy. Inaddition,stressedin
their review that enhancing spam detection methods on social media platforms requires
anefficientdata‑gatheringstrategy[34].
Following data collection, comments are manually categorized into two primary
groups: spamcommentsandnon‑spamremarksononlinegambling. Thisprocedureen‑
tails going over every remark in detail and looking for reoccurring themes in comments
thatpromoteonlinegambling, suchasmentionsofgamblingwebsites,referralcodes,or
termsrelatedtogambling. Toguaranteeahighdegreeofaccuracy,thelabelingselections
arebasedonpredeterminedcriteria. Becausespamcommentsfrequentlydisplaylinguistic
patternchangesthatarechallengingtoidentifyusingautomatedapproachesalonewith‑
out enough model training, this manual approach was adopted. The data produced by
hand labeling are more accurate and may be used as a starting point for the subsequent
developmentofamoretrustworthyclassificationmodel.
TheusageofYouTube’spublicdatacomplieswithrelevantrulesandethicalstandards.
Nodatacontainingsensitivepersonalinformationareobtained; only publiclyaccessible
informationisgathered. Toensurethebestpossibleprotectionofuserprivacyandrights,
the data collecting and labeling procedures are carried out exclusively for research and
analyticalreasons.
The study can effectively access and handle YouTube comment data using this
method,producingahigh‑quality,organizeddataset. Thisdatasetincludespreciselabels
toaidinfutureresearchinidentifyingandcategorizingonlinegamblingspamcomments,
inadditiontoreflectingthegeneralfeaturesofcomments.
3.3. DataPreprocessing
In order to prepare the gathered comments for the best possible use in training a
transformer‑based machine learning model, the data preparation step was completed in
thisstudy. Thefirststepinthisprocedureistextcleaning,whichinvolvesstandardizing
theformatofallcomments.
Converting all characters to lowercase is the first step in text cleaning since it elim‑
inates needless distinctions between capital and lowercase letters. After that, just letters

Eng.Proc.2025,107,66 6of17
andspacesremainoncesuperfluouscharacterslikesymbolsandnumeralsareeliminated.
To make the writing clearer and more organized, extra spaces are also removed. This
stageisessentialforloweringdatanoise,whichhelpsthemodelidentifypatternsthatare
alreadythere. Accordingto[35],textcleaningisacrucialstepinthedetectionofspamin
socialmediacomments. Toimprovetheefficacyofmachinelearningmodels,preprocess‑
ingmethodsliketextnormalizationandtokenizationarecrucial.
Incompletedata, particularlycommentswithemptyvaluesinthecommentorlabel
fields,areeliminatedfollowingtextcleaning. Thisguaranteesthatthedatasetisgenuinely
authenticandfreeofinformationthatcaninterferewiththemodel’sabilitytolearn. Fur‑
thermore, commentlabelsaretransformedintonumericalrepresentationsothatthema‑
chinelearningmodelcaninterpretthemandprovidesuitablevaluesfortheonlinecasino
spamandnon‑spamcategories.
Thecleanedtextmustnextbeformattedsothatthemachinelearningmodelcancom‑
prehendit. Textistransformedintoanumericalrepresentationbytokenization. Tokeniza‑
tion is done in this study using IndoBERT, a tokenizer that works with the transformer
model. Tokenizationistheprocessofdividingthetextintosmallerpieces,ortokens,and
transforming them into numerical values that the model can understand. Additionally,
thisprocedureusestruncationtocutexcessivelylongtextssotheydonotgooverthepre‑
determinedlimitandpaddingtoguaranteethatallinputshavethesamelength. Ref.[36]
showedthattransformer‑basedmodelsmayachieveexcellentperformanceinSMSspam
identification,demonstratingtheeffectivenessoftransformermodelsinspamdetectionin
earlierinvestigations.
Thecleanedandtokenizeddatasetisdividedintotwosectionsformodeltrainingand
assessmentwhenpreprocessingisfinished. Thedatausedinthisstudyaredividedinto
twosets: thetrainingset(80%)andthetestset(20%). Whileretainingaportionofthedata
forobjectivelyassessingmodelperformance,thisdivideguaranteesthatthemodelobtains
anadequatenumberofsamplesforlearning.
Followingthepreprocessingphase,theunstructuredcommentdatahavebeencleaned
upandpreparedforuseinbothmodeltrainingandinference. Throughappropriatepre‑
processing and the use of transformer‑based models like IndoBERT, this work seeks to
improvetheefficacyofsocialmediaspamcommentidentification.
3.4. DataExploration
3.4.1. DatasetOverview
Thedatasetusedinthisstudyconsistsof2,315YouTubecommentscollectedviathe
YouTubeDataAPI.EachdataentrycontainsinformationonthevideoID,userID,comment
content, timestamp, like count, and label, as summarized in Table 1. The label indicates
whetherthecommentisclassifiedasonlinegamblingpromotion(spam)ornot(non‑spam).
Table1.Gamblingpromotiondatasetoverview.
Attributes Description
VideoID Identifiesthevideowherethecommentwasposted
UserID Representstheuniqueidentifieroftheuserwhomadethecomment
Comment Containsthetextualcontentoftheuser’scomment
Timestamp Indicatesthedateandtimethecommentwasposted
Likecount Showsthenumberoflikesreceivedbythecomment
Label Theclassificationlabel,where1=Onlinegamblingspamand0=Non‑spam
3.4.2. DataCleaning
Before training the IndoBERT model, data cleaning was performed to ensure data
quality.

Eng.Proc.2025,107,66 7of17
•
Handling missing values: The dataset contains 13 missing comments, which were
removedtomaintaindataintegrity.
•
Text preprocessing: Special characters, symbols, and unnecessary spaces were re‑
movedtonormalizethetextforfurtherprocessing.
•
Tokenization:TheIndoBERTtokenizerwasappliedtosegmenttextintosmallerunits,
ensuringthatthemodelaccuratelycaptureslinguisticstructures.
3.4.3. LabelDistribution
The dataset consists of 1170 spam comments promoting online gambling and 1145
non‑spamcomments. Thenearlybalancedclassdistributionensuresthatthemodelisnot
biasedtowardaparticularcategory, makingitsuitablefortrainingarobustclassifier, as
illustratedinFigure2.
Figure2.Labeldatasetdistribution.
3.4.4. CharacteristicsofGamblingSpamComments
Uponfurtheranalysis,gamblingspamcommentsoftenexhibitthefollowingspecific
characteristics:
• The frequent use of encoded text or modified spellings (e.g., “AEЯO８8” instead of
“AERO88”)tobypassautomaticdetection;
•
Promotional phrases that encourage users to engage in gambling, such as “Main di
AEЯO８8bikinautohappy!” (PlayonAERO88,guaranteedhappiness!);
•
Mentionsofgamblingplatforms,referrallinks,ormisleadingclaimsaboutpotential
winnings.
3.4.5. ImplicationforModelTraining
Giventhestructureandcharacteristicsofthedataset,IndoBERTwaschosenduetoits
superior ability to process Indonesian text. The preprocessing steps, including tokeniza‑
tion and label balancing, further optimize the model’s learning capabilities. This explo‑
rationprovidesasolidfoundationforaccuratespamclassificationinYouTubecomments.
3.5. ModelSelection
3.5.1. IndobertModel
BecauseIndoBERTisbetterthanothermodelsatunderstandingtheIndonesianlan‑
guage,itwasselectedasthemainmodelforthisinvestigation. IndoBERT,aBERTvariant
tailoredforIndonesian, hasdemonstratedexceptionalperformanceinarangeofnatural
language processing (NLP) applications, such as emotion categorization and sentiment

Eng.Proc.2025,107,66 8of17
analysis. Accordingtorecentresearch,IndoBERToutperformsotherNLPmodelsonthese
taskswhenpairedwithotherneuralnetworkdesignslikeBiLSTMandBiGRU[28].
IndoBERT’s superiority over Recurrent Neural Network (RNN)‑based models like
LongShort‑TermMemory(LSTM)andBidirectionalLSTM(BiLSTM)incapturingthelin‑
guistic context and structure of the Indonesian language is one of the primary factors in
its selection. Because RNN‑based models process information sequentially, they are not
verygoodatcapturinglong‑rangewordrelationships. BiLSTMislesseffectiveathandling
complicated texts with substantial linguistic variances, despite its ability to comprehend
contextinbothdirections. AlthoughBiLSTMisfrequentlyemployedinNLPtasks,priorre‑
searchshowsthatitstillhastroublewithlong‑termdependencies. Asaresult,transformer‑
basedmodelssuchasIndoBERTcanimproveitsperformance[28]. Furthermore,research
indicatesthatLSTMstillhasdifficultiescapturingwordassociationsincomplicatedregres‑
sionandnaturallanguageprocessingtasks,despitethefactthatitwascreatedtosolvethe
vanishinggradientproblem[37].
Additionally,studiesby[38]showthatmonolingualmodelslikeIndoBERTaremore
sensitivethanmultilingualmodelslikeXLM‑RoBERTainNamedEntityRecognition(NER)
tasks for Indonesian. This bolsters the claim that models trained exclusively for Indone‑
sianoutperformmultilingualtransformersorRNN‑basedmethods. IndoBERTisthebest
optionforidentifyingonlinegamblingpromotioninIndonesianYouTubecommentswhen
takingintoaccountitsbenefitsincomprehendingthesyntacticandsemanticstructureof
IndonesianaswellasactualdatapointingouttheshortcomingsofBiLSTMandLSTM.
However,multilingualtransformermodelsthatcanhandlemanylanguages,includ‑
ingIndonesian,includeMultilingualBERT(mBERT)andXLM‑RoBERTa. Recentresearch,
however,showsthatmultilingualmodelslikeXLM‑RoBERTaarelesssensitivethanmono‑
lingual models like IndoBERT in Indonesian natural language processing tasks [38]. In
order to improve accuracy and relevance in comprehending Indonesian syntax and se‑
mantics,IndoBERTistrainedutilizingalargercorpusoftextintheIndonesianlanguage,
encompassingavarietyoftextsourceslikenews,socialmedia,andscholarlypublications.
Furthermore,studiesontheconstructionofIndonesianlanguagemodelsindicatethat
transformer‑basedmodelsthataretailoredforcertaintasksperformbetterthanmultilin‑
gual or general‑purpose language models. For instance, it has been demonstrated that
IndoGovBERT,whichwascreatedespeciallyforIndonesiangovernmentdocuments,out‑
performsmultilingualmodelslikemBERTintermsoftextcategorizationanddocument
similarity evaluation [30]. These results emphasize how crucial it is to use models that
are customized to meet certain requirements, such as identifying comments about on‑
line gambling promotions that use a variety of frequently altered terminology to avoid
automateddetection.
IndoBERTisthebestoptionforidentifyingonlinegamblingadvertisinginIndonesian
YouTubecommentswhenthesecharacteristicsaretakenintoaccount. InIndonesiantext
classificationtasks,thismodelnotonlyperformsbetterthanRNN‑basedandmultilingual
transformermodelsbutalsohasadvantagesincontextualunderstandingandprocessing
efficiency. IndoBERTisthebestmodelforthisstudysincepriorresearchhasdemonstrated
itssuperiorityinhandlingNLPtasksuniquetoIndonesia.
3.5.2. IndoBERT’sArchitecture
SpecificallydesignedtohandletextintheIndonesianlanguage,IndoBERTisamodel
basedonBidirectionalEncoderRepresentationsfromTransformers(BERT).Bidirectional
contextual understanding of words within a sentence is made possible by this model’s
severallayersofmulti‑headself‑attentionencoders. TheMaskedLanguageModel(MLM)

Eng.Proc.2025,107,66 9of17
approachdoesthisbyenablingthemodeltoconcurrentlyrecordwordmeanings,depend‑
ingoncontextfrombothsides[39].
Thegeneralpre‑trainingandfine‑tuningprocessofBERTisdepictedinFigure3. The
sameideasapplytoIndoBERTeventhoughthisprocessismainlysuitedtoBERT.Thispic‑
tureshowshowthemodelisinitializedfordifferentdownstreamtasks,suchidentifying
YouTubecommentsthatcontainonlinegamblingadvertising,usingpre‑trainedmodelpa‑
rameters. Allmodelparametersaremodifiedduringfine‑tuninginordertoaddressthis
particular task of determining whether a comment contains content related to gambling
advertising. Whilethe[SEP]tokenactsasaseparatortoidentifydistinctinputsegments
(suchasbetweenacommentandextrametadata),the[CLS]tokenisaspecialsymbolap‑
pendedatthestartofeachinput.
(a) (b)
Figure3.(a)Pre‑training.(b)Fine‑tuningprocedureforBERT.Reprintedfrom[39].
IndoBERThandlestextinputthathasbeentransformedintotokensusingWordPiece
Tokenizationoncethemodelhasbeeninitializedwithpre‑trainedparameters. Theinput
representation in BERT is depicted in the following picture, Figure 4, and is made up of
three fundamental embedding types: positional, segment, and token embeddings. Sub‑
words or words that have undergone tokenization processing are represented by token
embeddings. Positionalembeddingsgiveinformationabouttherelativepositionofwords
inasentence,whereassegmentembeddingsshowwhichportionoftheinputtheybelong
to(suchaswhetheritisacommentormetadata).
Figure4.BERTinputrepresentation.Reprintedfrom[39].
BecauseitshowshowinputrepresentationisbuiltinBERTandIndoBERT,Figure4is
essential. Vectorrepresentationsoftheinputarecreatedbycombiningtoken,segment,and
positionalembeddings;theserepresentationsaresubsequentlyprocessedfurtherthrough
theencoderlayers.

Eng.Proc.2025,107,66 10of17
IndoBERTusesmulti‑headself‑attentionineachencoderlayertocomprehendthere‑
lationshipsbetweenwordsinasentenceaftertheinputhasbeentransformedintovector
representations. Thisenablesthemodeltorecognizewhetheracommentcontainsonline
gambling promotions by capturing textual context and trends. IndoBERT is more effec‑
tiveincapturingwordassociationsbecauseitanalyzescompletesentencesinparallel,as
opposedtosequentiallyprocessingtextlikeRecurrentNeuralNetwork(RNN)‑basedtech‑
niquessuchasLongShort‑TermMemory(LSTM)andBidirectionalLSTM(BiLSTM).
IndoBERTfunctionsasfollowswhenitcomestocategorizingYouTubecommentsthat
includeadvertisementsforonlinegambling: First,WordPieceTokenizationisusedtosplit
thetextintoitssmallestpartsincommentsthatareextractedfromYouTubevideos. After
that, each created token is transformed into a vector representation by fusing positional,
segment, and token embeddings. The model can then determine whether the comment
containsgamblingpromotioncontentbyprocessingthesevectorrepresentationsthrough
encoderlayerstoproducerichercontextualrepresentations.
Afullyconnectedlayerwithasoftmaxorsigmoidactivationfunctionthenreceives
theseenrichedrepresentationsanddecidesifthecommentqualifiesasanonlinegambling
promotion. Even when the language is subtle or concealed, IndoBERT can differentiate
betweencommentsthatarepromotinggamblingandthosethatarenot.
3.6. ModelTraining
TheIndoBERTmodel,atransformer‑basedmodelpre‑trainedonanIndonesianlan‑
guage corpus, is used in this study to optimize performance in classifying comments
throughasystematictrainingandfine‑tuningprocess. Themodelismodifiedbyaddinga
classificationlayerattheend,whichensuresthatthenumberofoutputneuronsmatches
thenumberofclassesinthedataset. Priortotraining,thedatasetisdividedintotwomain
subsets,with80%setasidefortrainingand20%fortesting. Tomaintainclassdistribution
betweencommentscontaininggamblingpromotionsandothercomments,astratifiedsam‑
plingtechniqueisusedtoensurebalancebetweentheclassdistribution.
Thechoiceoftrainingparameters,inparticularthelearningrate,isbasedonprelimi‑
naryresearchandtheliteratureontransformermodelsaswellasanumberofrecentstud‑
ies that highlight the critical role of learning rate configuration in various deep learning
applications. Forexample,learningratemodulationinaTiOxmemristorarrayduringin
situtrainingacceleratesconvergenceandreducesenergyconsumptioninthefieldofneu‑
romorphic computing [40], while [41] found that convolutional neural networks (CNN)
performedbestintyphoonrainfallforecastingapplications,withlearningratesof0.1,0.01,
and 0.001 significantly improving long‑term prediction capabilities. Furthermore, in the
field of fractal image coding showed that the learning rate is a critical factor in artificial
neuralnetworks’recognitionofrecursivefunctionsthatproducefractalforms[42]. Used
anadaptivelearningratemechanisminthefieldofLoRaWAN–IoTlocalization[43]. They
achieved up to 98.98% accuracy by employing piecewise, exponential decay and cosine
annealingdecaytechniques.
Basedontheseresults,thisstudydeterminesthattheideallearningrateforIndoBERT
is 2
×
10
−5,
taking into account the features of transformer‑based models and the text
classification task. The model is trained for six epochs with a batch size of 16 samples
per device, balancing training speed and memory usage, and regularization techniques
areappliedthroughweightdecaywithavalueof0.01andanearlystoppingstrategythat
stops training if no performance improvement occurs for two consecutive epochs. The
model is evaluated at each epoch using validation data, measuring accuracy, precision,
recall,andF1‑score.

Eng.Proc.2025,107,66 11of17
The significance of these methods in improving the performance of deep learning
models and avoiding overfitting has been emphasized in recent research. New method
that uses training history to identify overfitting is more effective than traditional meth‑
ods[44],while[45]highlightedtheusefulnessofregularizationthroughweightdecayand
hyperparametertuning,suchasbatchsizeandthenumberofepochs,tobalancetraining
speed and memory usage. Evaluation using metrics like accuracy, precision, recall, and
F1‑scorehasalsobeenwidelyusedinstudies. Forexample,usedTF–IDFandSVMinsen‑
timent analysis and obtained 85% accuracy, 100% precision, 70% recall, and an F1‑score
of 82% [46]. Research by [47] supported similar results, demonstrating 95% accuracy in
multi‑labelclassificationtasksusingCNNforfruitflavorcategorization.
According to these research articles, the use of regularization strategies like weight
decay and early stopping, as well as hyperparameter settings like batch size and epoch
count, are crucial components of the training process. This method guarantees that
the final model generalizes effectively to new data, in addition to helping to maximize
modelperformance.
Every100stepsduringtraining,alogisrecordedtotrackthemodel’sdevelopment.
The16‑bitnumericalprecisionimprovescomputationalefficiencybyenablingquickerpro‑
cessingwithoutappreciablysacrificingaccuracy. Basedontheexaminationofvalidation
data,themodelthatperformsthebestispreservedforfurthertestingusingtestdatathat
havenotbeenseenyet. Thegoalofthislastassessmentistoconfirmthatthemodelcan
recognizecommentsonYouTubethatpromoteonlinegambling.
4. ResultandDiscussion
4.1. ModelPerformanceDuringTraining
Figure5showsthelosscurveduringthetrainingprocess,illustratingthechangesin
the IndoBERT model’s loss values on training and validation data from epoch to epoch.
Althoughtheinitialtrainingplanwasforsixepochs,theapplicationoftheearlystopping
techniquehaltedtrainingatthefifthepoch. Thistechniquewasimplementedtoprevent
overfitting,whichoccurswhenthevalidationlossstopsimprovingorstartstoincrease.
Figure5.Traininglossandvalidationlosscurvesduringthetrainingprocess.
Ascanbeseenfromthegraph,validationlossremainsrelativelystableandreachesits
lowestvalueatthethirdepoch, eventhoughtraininglossincreasesslightlyatthispoint.
Although the early stopping mechanism stopped the entire training process at the fifth
epoch,themodelfromthethirdepochwaschosenasthefinalmodelforfurtherevaluation.

Eng.Proc.2025,107,66
12of17
Traininglossdecreasesduringthefirstepochbutshowsaslightincreaseatthethirdepoch,
beforesignificantlydecreasingagainuntilthefifthepoch.
4.2. EvaluationMetrics
A confusion matrix and a number of important evaluation metrics were employed
inadditiontotheanalysisofthelossgraphtoassesstheIndoBERTmodel’sperformance,
andtheevaluationresultsshowthatthemodelperformedexceptionallywellinidentifying
onlinegamblingpromotionsinYouTubecomments. Asummaryoftheevaluationresults
duringtrainingisprovidedinTable2.
Table2.TrainingandevaluationmetricsperepochforIndoBERTmodel.
Training Validation
| Epoch |     | Accuracy | Precision | Recall | F1‑Score |
| ----- | --- | -------- | --------- | ------ | -------- |
Loss Loss
| 1 0.2266 | 0.0855 | 96.96% | 96.97% | 96.96% | 96.96% |
| -------- | ------ | ------ | ------ | ------ | ------ |
| 2 0.0368 | 0.0949 | 98.04% | 98.09% | 98.04% | 98.04% |
| 3 0.0558 | 0.0626 | 98.26% | 98.28% | 98.26% | 98.26% |
| 4 0.0163 | 0.0878 | 97.83% | 97.86% | 97.83% | 97.83% |
| 5 0.0073 | 0.0867 | 97.61% | 97.65% | 97.61% | 97.61% |
Thefinalevaluationresultsofthemodel(basedonthe3rdepoch)areshowninTable3.
Table3.Finalevaluationresults.
| ValidationLoss | Accuracy | Precision |     | Recall | F1‑Score |
| -------------- | -------- | --------- | --- | ------ | -------- |
| 0.0626         | 98.26%   | 98.28%    |     | 98.26% | 98.26%   |
To gain a better understanding of the model’s misclassification tendencies, a study
was also carried out utilizing the confusion matrix, as shown in Figure 6. Which shows
thatthemodelcorrectlyidentified232spamcomments(truepositives)and221non‑spam
comments(truenegatives),withonlyasmallnumberofmisclassifications.
Figure6.ConfusionmatrixpredictionresultsfromtheIndoBERTmodel.
ResultsfromtheconfusionmatrixshowedthattheIndoBERTmodelperformsexcep‑
tionallywellwitharelativelylowerrorrate.

Eng.Proc.2025,107,66 13of17
•
Themodelsuccessfullyclassified232positivecomments(truepositives)and221neg‑
ativecomments(truenegatives).
•
There were six false positive cases, where non‑spam comments were misclassified
asspam.
•
Thereweretwofalsenegativecases,wherespamcommentswerenotdetected.
ThesefindingsdemonstratethattheIndoBERTmodelperformsremarkablywell,with
areasonablylowerrorrate. Theselectionofthemodelfromthethirdepochwasbasedon
thelowestvalidationloss,assuringexcellentgeneralizationcapabilities.
4.3. ErrorAnalysis
To find out what kinds of misclassifications the IndoBERT model performed while
categorizingYouTubecommentsononlinegamblingadvertising,erroranalysiswasdone.
Falsepositivesandfalsenegativesarethetwoprimarycategoriesintowhichthesecatego‑
rizationmistakesfall. Falsenegativesoccurwhenthemodelmissescommentsthatreally
encourageonlinegambling,whereasfalsepositiveshappenwhenthealgorithmmisclassi‑
fiesnon‑promotionalremarksasgamblingpromos.
A few misclassification situations that have been found show that the IndoBERT
model still has trouble comprehending some of the subtleties of user comments. For in‑
stance,whilehavingnoclearpromotionalaim,briefandunclearremarkslike“p”or“hadir
teruss”wereincorrectlycategorizedasgamblingadvertisements. Furthermore,themodel
had trouble differentiating comments that contained frequently used gambling‑related
phrasesbutwerenottrulypromotional. Forexample,“hokiditahun”isabroadphrase
thatwasmistakenlylabeledasspam.
Furthermore,whengamblingincentiveswerecommunicatedimplicitlywithoutspecif‑
ically referencing frequently recognized gambling‑related phrases, false negatives hap‑
pened. Forexample, remarkslike“pecahterus,” whicharefrequentlyusedingambling
promotions,wereoccasionallyoverlookedassuch. Additionally,themodelshowedshort‑
comingsinidentifyingrarepatternsoflanguagethatwerenotwell‑representedinthetrain‑
ingdataset, suchasinformallanguageusageorspellingvariantsthatwerenotincluded
intheoriginaltrainingdata.
ExamplesofmodelpredictionerrorsarepresentedinTable4,illustratingcasesoffalse
positivesandfalsenegativesencounteredbytheIndoBERTmodel.
Table4.Examplesofmodelpredictionerrors.
VideoID UserID Comment ActualLabel PredictedLabel
floAzPKw61U UC7JppsOC8SjViHkmP6yzCmQ p 0 1
01Te9sIsYi8 UC5B6cCoKW_XddWxy18b6kRA oyyysehatlucouniimaa 0 1
qAANjaNp2i0 UCvNccq2p5ROyd8‑im691Ycw pecahterus 1 0
diytbikinkontendahbiasadiyt
gupay6opGZ4 UCEeRUv0CYWXzXq1NKbbfgOw promosiinadekbiarcepetnikah 1 0
luarbiasaaaaaaaaaaaaa
TheseerrorssuggestthattherearestillanumberofwaystoimprovetheIndoBERT
model,includingaddingmorediversedatatothetrainingprocesstohelpthemodelcap‑
ture a wider range of linguistic patterns, fine‑tuning the model with a more flexible ap‑
proach to informal language to help reduce misclassification errors, and integrating the
IndoBERT model with rule‑based filtering techniques to handle particular cases that are
hardtodetectwithmachinelearningmodelsalone.
Byimplementingtheseenhancements,themodelisexpectedtoachievegreateraccu‑
racy in detecting online gambling promotion comments while minimizing classification
errors.

Eng.Proc.2025,107,66 14of17
4.4. DiscussiononPracticalImplications
TheresultsofthisstudydemonstratethattheIndoBERTmodelhassignificantpoten‑
tial in detecting online gambling promotion comments on YouTube. Implementing this
modelinreal‑worldscenarioscanassistsocialmediaplatforms,contentcreators,andreg‑
ulatorsinidentifyingandreducingthespreadofillegalorunwantedcontent.
Oneoftheprimarypracticalimplicationsofthisresearchisitsabilitytoenhanceau‑
tomation in moderating comments on YouTube. With a model capable of accurately de‑
tectingonlinegamblingpromotioncomments, thesystemcanautomaticallyflagorhide
spam‑like comments before they are seen by other users. This not only improves user
experiencebutalsohelpsmaintainahealthierandsaferdigitalecosystem.
Additionally,platformsmayhandleawiderspectrumofpolicyinfractionsbyinclud‑
ing the IndoBERT model into an automated detection system. For example, the model
may be modified to detect various sorts of spam, such as online fraud, hate speech, or
falseinformation. BERT‑basedmodelshavedemonstratedencouragingperformanceina
numberoftextclassificationtasks,suchasmisinformationidentificationandhatespeech
detection [48,49]. Content moderators may thus use this model as a useful tool to filter
commentsthatmightbeagainstcommunitynorms.
The created model has been made available on Hugging Face as a follow‑up mea‑
sure to increase accessibility. Users can use the model without retraining because it
is accessible through an API and is published in a public repository. It is available at
https://huggingface.co/jelialmutaali/online‑gambling‑spam‑detector (accessed on 24 July
2025). Therepositorypagehascomprehensiveusageinstructions. Bymakingthemodel
publiclyaccessible,thisstudypromotesitsuseinavarietyofautomateddetectionsystems
inadditiontoallowingotherresearcherstoreplicateandvalidateit.
Authoritiescanalsoutilizethisapproachintheregulatoryenvironmenttospotand
keepaneyeonnewtrendsinonlinegamblingmarketingacrossdigitalplatforms. Regula‑
torsmaybetterunderstandthetrendsofonlinegamblingmarketingandimplementmore
successfulregulatory measuresto stop illicit activityby gathering datafrom a varietyof
sources. Previous research articles have demonstrated that governments and regulators
are increasingly using natural language processing (NLP) tools to monitor social media
forunlawfulactions,suchashatespeechanddisinformation[50].
Nevertheless,beforethemodeliswidelyused,anumberofissuesneedtoberesolved,
eventhoughitperformswellincommentcategorization. Makingsurethemodelcanman‑
agetheextremelydynamiclanguagefoundinusercommentsisamajorproblem,particu‑
larlywheninventivespellingsorhiddenwordsareemployedtoavoidautomaticdetection.
Adversarialassaults,inwhichtextinputsarealteredtoevadedetectionsystems,canalso
affectNLPmodels[51,52]. Tolessenthis,thesystemhastoupdatethemodeloftenusing
themostrecentdatainordertocontinueidentifyingpatternsinonlinegamblingpromo‑
tionsandbolsteritsdefensesagainsthostileattacks.
Additionally, ethical and privacy policy considerations must be taken into account
whenimplementingthismodelintherealworld. Sinceoverlyaggressiveautomateddetec‑
tionsystemsruntheriskofexcessivecensorshipormisclassification,whichcouldrestrict
users’freedomofexpression,amorebalancedapproachthatincludesahuman‑in‑the‑loop
mechanismisrequired,allowinghumanmoderatorstoreviewmodelclassificationsprior
tofinaldecisionsbeingmade. Inthisregard,self‑diagnosisandself‑debiasingapproaches
in NLP can be potential solutions to reduce bias and improve the transparency of auto‑
mateddetectionsystems[53]asneeded.
Giventheseadvantagesanddifficulties,usingIndoBERTtoidentifycommentsabout
onlinegamblingpromotionsmayprovetobeausefulwaytomoderatedigitalmaterial. To

Eng.Proc.2025,107,66 15of17
guarantee more openness and confidence in practical applications, future advancements
mayincorporaterule‑basedfilteringmethodsandenhancemodelinterpretability.
5. Conclusions
ThisstudyanalyzedtheeffectivenessofIndoBERTindetectingonlinegamblingpro‑
motioninYouTubecomments. TheresultsdemonstratethatIndoBERTachieveshighac‑
curacy(98.26%),precision(98.28%),recall(98.26%),andF1‑score(98.26%),makingitare‑
liablemodelforidentifyinggambling‑relatedspam. However,themodelstillencounters
challengesindetectingimplicitpromotionallanguageandambiguousexpressions.
To enhance performance, future improvements could involve expanding training
datasets to include more diverse language variations, integrating rule‑based filtering for
specificwordpatterns,andimplementingcontinuousmodelupdatestoadapttoevolving
spamstrategies. Additionally,combiningIndoBERTwithhumanmoderationcouldmiti‑
gatemisclassificationrisks,ensuringabalancedandeffectivecontentmoderationsystem.
Thefindingsofthisstudyhavesignificantimplicationsforautomatedcontentmoder‑
ationondigitalplatforms,aidingregulatorsandsocialmediaplatformsincombatingthe
spreadofonlinegamblingpromotions. Bymakingthetrainedmodelpubliclyaccessible,
thisresearchcontributestothebroaderfieldofNLP‑basedspamdetectionandprovidesa
valuabletoolforenhancingdigitalsecurityinIndonesia.
Author Contributions: Conceptualization, M.P.A. and M.J.A.; methodology, M.P.A. and M.J.A.;
software, M.J.A.; validation, M.P.A., R.R. and K.K.; formal analysis, M.J.A.; investigation, M.J.A.
andR.R.; resources, M.P.A., M.J.A.andR.R.; datacuration, M.J.A.; writing—originaldraftprepa‑
ration, M.P.A.; writing—review and editing, M.P.A., R.R., K.K. and I.L.K.; visualization, M.J.A.;
supervision, K.K. and M.P.A.; project administration, M.P.A. and R.R. All authors have read and
agreedtothepublishedversionofthemanuscript.
Funding:Thisresearchreceivednoexternalfunding.
InstitutionalReviewBoardStatement:Notapplicable.
InformedConsentStatement:Notapplicable.
DataAvailabilityStatement:Thetrainedmodelandthedatasetgeneratedandanalyzedduringthis
study are openly available in the Hugging Face repository at https://huggingface.co/jelialmutaali/
online‑gambling‑spam‑detector(accessedon24July2025).
ConflictsofInterest: Theauthorsdeclarenoconflictofinterest.
References
1. Padilah,S.;Afrioza,S.;Mursiah,M.PengaruhpenyuluhanplatformjudionlineterhadapkesehatanmentalremajadiKelurahan
KalibaruKabTangerang.J.IlmuKesehat.BhaktiHusadaHealthSci.J.2024,15,414–422.[CrossRef]
2. Pradika,M.F.StudyofOnlineGamblingPromotionPolicyinIndonesia,Pakistan,andUSA.EttisalJ.Commun. 2024,9,35–58.
[CrossRef]
3. Damayanti,F.Analisistindakpidanakejahatanjudionlineberdasarkanhukumpositif. Pros.SNAPPSos.Hum. Pertan.Kesehat.
Teknol.2024,2,25–32.[CrossRef]
4. Almahdi, N.A. Dampak tayangan konten YouTube ‘Close the Door’ terhadap pemenuhan kebutuhan informasi bahaya judi
online.Commercium2024,8,206–214.[CrossRef]
5. Jailani,A.;NurAisyah,R.;FathulArifin,M.H.;Efendi,R.;Ajry,M.A.Sosialisasimeningkatkankesadaranmasyarakatibu‑ibu
PKKDesaTegalrejotentangdampakburukjudionline.J.AbdiNusa2024,4,217–226.[CrossRef]
6. Karli,K.; Harvelian,A.; Safitri,A.M.; Wahyudi,A.; Pranacitra,R.Penyuluhanpengabdianhukumdalammengatasidampak
negatifjudionlineterhadapkesejahteraanburuh. PundimasPubl.Kegiat.Abdimas2023,2,86–92.[CrossRef]
7. Krisna,D.;Sari,K.S.;Anggraini,N.;Royani,W.Kejahatancyber:Tinjauanpsikobehavioristik.IstisyfaJ.Islam.Guid.Couns.2024,
2,256–265.[CrossRef]

Eng.Proc.2025,107,66 16of17
8. DwiKurniawan,S.;Suhartono,S.;Waris,W.;Rizqi,A.M.Penyuluhanstrategipengendalianperjudiandaringpadakalangan
penegakhukumdiKantorKepolisianResortKebumen. J.Masy.MadaniIndones.2024,3,320–324.[CrossRef]
9. Perdana,R.B.;Budi,I.;Santoso,A.B.;Ramadiah,A.;Putra,P.K.DetectingonlinegamblingpromotionsonIndonesianTwitter
usingtextminingalgorithm. Int.J.Adv.Comput.Sci.Appl.2024,15,893–900.[CrossRef]
10. Azahra,I.P.;Wardhani,V.J.;Devinta,L.C.;Khaliala,N.;Rohma,V.B.;Bahanan,A.A.G.;Fitrianto,T.A.;AryaD,M.F.Analisis
penggunaanBahasaIndonesiadalampromosionlinebagipelakuusahakecildankelasmenengah.J.Bhs.Drh.Indones.2024,1,
8.[CrossRef]
11. Nikmatullah,M.R.Wacanapesansingkatiklanjudionline.Mabasan2024,18,187–206.[CrossRef]
12. Koto,F.;Rahimi,A.;Lau,J.H.;Baldwin,T.IndoLEMandIndoBERT:ABenchmarkDatasetandPre‑trainedLanguageModel
forIndonesianNLP.InProceedingsofthe28thInternationalConferenceonComputationalLinguistics,Barcelona,Spain,8–13
December2020;pp.757–770.[CrossRef]
13. Islamey,J.;Jonathan,V.;Nurzaki,M.;Lucky,H.Comparativeanalysisofencoder‑basedpretrainedmodels: Investigatingthe
performanceofBERTvariantsinIndonesianquestion‑answering. InProceedingsofthe2024InternationalConferenceonArti‑
ficialIntelligence,Blockchain,CloudComputing,andDataAnalytics(ICoABCD),Virtual,Indonesia,20–21August2024;IEEE:
Piscataway,NJ,USA,2024;pp.309–314.[CrossRef]
14. Ramadhan,T.I.;Supriatman,A.;Kurniawan,T.R.EvaluasidanimplementasiIndoBERTquestionanswering(QA)padadomain
spesifikmenggunakanMeanReciprocalRank.J.Algoritma2024,21,180–188.[CrossRef]
15. Sebastian,D.;Purnomo,H.D.;Sembiring,I.BERTfornaturallanguageprocessinginBahasaIndonesia. InProceedingsofthe
20222ndInternationalConferenceonIntelligentCyberneticsTechnology&Applications(ICICyTA),Bandung,Indonesia,15–16
December2022;IEEE:Piscataway,NJ,USA,2022;pp.204–209.[CrossRef]
16. Amin,M.B.M.;Hakim,G.;Maulana,M.T.;Alwan,M.F.;Anggraheni,H.S.;Naufal,M.J.;Yudistira,N.DeteksiSpamBerbahasa
IndonesiaBerbasisTeksMenggunakanModelBert.J.Teknol.Inf.IlmuKomput.2024,11,1291–1302.[CrossRef]
17. Merdiansah, R.; Siska, S.; Ridha, A.A. Analisis Sentimen PenggunaX Indonesia TerkaitKendaraan Listrik Menggunakan In‑
doBERT.J.IlmuKomput.Sist.Inf.JIKOMSI2024,7,221–228.[CrossRef]
18. Nabiilah,G.Z.; Prasetyo,S.Y.; Izdihar,Z.N.; Girsang,A.S.BERTbasemodelfortoxiccommentanalysisonIndonesiansocial
media.ProcediaComput.Sci.2023,216,714–721.[CrossRef]
19. Sagama,Y.;Alamsyah,A.Multi‑LabelClassificationofIndonesianOnlineToxicityusingBERTandRoBERTa.InProceedingsof
the2023IEEEInternationalConferenceonIndustry4.0,ArtificialIntelligence,andCommunicationsTechnology(IAICT),Bali,
Indonesia,13–15July2023;IEEE:Piscataway,NJ,USA,2023;pp.143–149.[CrossRef]
20. Awalina,A.;Bachtiar,F.A.;Utaminingrum,F.PerbandinganPretrainedModelTransformerpadaDeteksiUlasanPalsu.J.Teknol.
Inf.IlmuKomput.2022,9,597–604.[CrossRef]
21. Mahmud,T.;Ptaszynski,M.;Masui,F.ExhaustiveStudyintoMachineLearningandDeepLearningMethodsforMultilingual
CyberbullyingDetectioninBanglaandChittagonianTexts.Electronics2024,13,1677.[CrossRef]
22. Muftie, F.; Yafi, K.M.; Addina, Q.M. Perbandingan performa deteksi cyberbullying dengan transformer, deep learning, dan
machinelearning.J.Pendidik.Inform.Sains2024,13,75–87.[CrossRef]
23. Arnanda, F.R.; Rahmah, A.N.A. Deteksi Pergerakan IHSG Berdasarkan Berita Daring Menggunakan Model Deep Learning
BerbasisTransformer.Semin.Nas.Off.Stat.2024,2024,439–448.[CrossRef]
24. Alamsyah,A.;Sagama,Y.EmpoweringIndonesianinternetusers: Anapproachtocounteronlinetoxicityandenhancedigital
well‑being.Intell.Syst.Appl.2024,22,200394.[CrossRef]
25. Boulieris,P.;Pavlopoulos,J.;Xenos,A.;Vassalos,V.Frauddetectionwithnaturallanguageprocessing. Mach. Learn. 2024,113,
5087–5108.[CrossRef]
26. Omar,M.;Choi,S.;Nyang,D.;Mohaisen,D.RobustNaturalLanguageProcessing: RecentAdvances,Challenges,andFuture
Directions.IEEEAccess2022,10,86038–86056.[CrossRef]
27. Danenas, P.; Skersys, T. Exploring Natural Language Processing in Model‑To‑Model Transformations. IEEE Access 2022, 10,
116942–116958.[CrossRef]
28. Ahmadian,H.;Abidin,T.F.;Riza,H.;Muchtar,K.HybridModelsforEmotionClassificationandSentimentAnalysisinIndone‑
sianLanguage.Appl.Comput.Intell.SoftComput.2024,2024,2826773.[CrossRef]
29. Hyder, S.B.; Tariq, N.; Moqurrab, S.A.; Ashraf, M.; Yoo, J.; Srivastava, G. BERT‑Based Deceptive Review Detection in Social
Media:IntroducingDeceptiveBERT.IEEETrans.Comput.Soc.Syst.2024,11,7234–7243.[CrossRef]
30. Riyadi,A.;Kovacs,M.;Serdült,U.;Kryssanov,V.IndoGovBERT:ADomain‑SpecificLanguageModelforProcessingIndonesian
GovernmentSDGDocuments.BigDataCogn.Comput.2024,8,153.[CrossRef]
31. Anggraeni,W.;Kusuma,M.F.A.;Riksakomara,E.;Wibowo,R.P.;Sumpeno,S.CombinationofBERTandHybridCNN‑LSTM
ModelsforIndonesiaDengueTweetsClassification.Int.J.Intell.Eng.Syst.2024,17,813–826.[CrossRef]
32. Oh,H.AYouTubeSpamCommentsDetectionSchemeUsingCascadedEnsembleMachineLearningModel. IEEEAccess2021,
9,144121–144128.[CrossRef]

Eng.Proc.2025,107,66 17of17
33. Ashraf, N.; Zubiaga, A.; Gelbukh, A.Abusivelanguagedetectioninyoutubecommentsleveragingrepliesasconversational
context.PeerJComput.Sci.2021,7,e742.[CrossRef]
34. Kaddoura,S.;Chandrasekaran,G.;Popescu,D.E.;Duraisamy,J.H.Asystematicliteraturereviewonspamcontentdetectionand
classification.PeerJComput.Sci.2022,8,e830.[CrossRef]
35. Chai,C.P.Comparisonoftextpreprocessingmethods.Nat.Lang.Eng.2023,29,509–553.[CrossRef]
36. Liu,X.;Lu,H.;Nayak,A.ASpamTransformerModelforSMSSpamDetection.IEEEAccess2021,9,80253–80263.[CrossRef]
37. Al‑Selwi,S.M.;Hassan,M.F.;Abdulkadir,S.J.;Muneer,A.LSTMInefficiencyinLong‑TermDependenciesRegressionProblems.
J.Adv.Res.Appl.Sci.Eng.Technol.2023,30,16–31.[CrossRef]
38. Khairunnisa,S.O.;Chen,Z.;Komachi,M.DatasetEnhancementandMultilingualTransferforNamedEntityRecognitioninthe
IndonesianLanguage.ACMTrans.AsianLow‑Resour.Lang.Inf.Process. 2023,22,1–21.[CrossRef]
39. Devlin,J.; Chang,M.‑W.; Lee,K.; Toutanova,K.BERT:Pre‑trainingofDeepBidirectionalTransformersforLanguageUnder‑
standing.arXiv2018,arXiv:1810.04805.[CrossRef]
40. Jang,J.;Gi,S.;Yeo,I.;Choi,S.;Jang,S.;Ham,S.;Lee,B.;Wang,G.ALearning‑RateModulableandReliableTiOxMemristor
ArrayforRobust,Fast,andAccurateNeuromorphicComputing.Adv.Sci.2022,9,2201117.[CrossRef][PubMed]
41. Uddin,M.J.;Li,Y.;Sattar,M.A.;Nasrin,Z.M.;Lu,C.EffectsofLearningRatesandOptimizationAlgorithmsonForecastingAc‑
curacyofHourlyTyphoonRainfall:ExperimentsWithConvolutionalNeuralNetwork.EarthSpaceSci.2022,9,e2021EA002168.
[CrossRef]
42. Al‑Jawfi,R.A.TheEffectofLearningRateonFractalImageCodingUsingArtificialNeuralNetworks.FractalFract.2022,6,280.
[CrossRef]
43. Swathika,R.;DilipKumar,S.M.;Srinidhi,N.N.;Harshitha,B.R.HarnessingLearnRateScheduleforAdaptiveDeepLearning
inLoRaWAN‑IoTLocalization.IEEEAccess2024,12,72034–72050.[CrossRef]
44. Li,H.; Rajbahadur,G.K.; Lin,D.; Bezemer,C.‑P.; Jiang,Z.M.KeepingDeepLearningModelsinCheck: AHistory‑BasedAp‑
proachtoMitigateOverfitting.IEEEAccess2024,12,70676–70689.[CrossRef]
45. Bejani,M.M.;Ghatee,M.AdaptiveLow‑RankRegularizationwithDampingSequencestoRestrictLazyWeightsinDeepNet‑
works.arXiv2021,arXiv:2106.09677.[CrossRef]
46. Gifari, O.I.; Adha, M.; Freddy, F.; Durrand, F.F.S.AnalisisSentimenReviewFilmMenggunakanTF‑IDFdanSupportVector
Machine.J.Inf.Technol.2022,2,36–40.[CrossRef]
47. Arum,R.P.;Prasetiadi,A.;Ramdani,C.KlasifikasiRasaBerdasarkanCitraBuahMenggunakanAlgoritmaConvolutionalNeural
NetworkDenganTeknikIdentitasGanda.IJIS‑Indones.J.Inf.Syst.2021,6,79.[CrossRef]
48. Aljawazeri,J.A.; Jasim,M.N.AddressingChallengesinHateSpeechDetectionUsingBERT‑BasedModels: AReview. IraqiJ.
Comput.Sci.Math.2024,5,4.[CrossRef]
49. Sharma,U.;Pandey,P.;Kumar,S.ATransformer‑BasedModelforEvaluationofInformationRelevanceinOnlineSocial‑Media:
ACaseStudyofCovid‑19MediaPosts.NewGener.Comput.2022,40,1029–1052.[CrossRef][PubMed]
50. Alsmadi,I.;Ahmad,K.;Nazzal,M.;Alam,F.;Al‑Fuqaha,A.;Khreishah,A.;Algosaibi,A.AdversarialNLPforSocialNetwork
Applications:Attacks,Defenses,andResearchDirections.IEEETrans.Comput.Soc.Syst.2023,10,3089–3108.[CrossRef]
51. Fursov,I.;Zaytsev,A.;Burnyshev,P.;Dmitrieva,E.;Klyuchnikov,N.;Kravchenko,A.;Artemova,E.;Komleva,E.;Burnaev,E.
ADifferentiableLanguageModelAdversarialAttackonTextClassifiers.IEEEAccess2022,10,17966–17976.[CrossRef]
52. Goyal, S.; Doddapaneni, S.; Khapra, M.M.; Ravindran, B. A Survey of Adversarial Defenses and Robustness in NLP. ACM
Comput.Surv.2023,55,1–39.[CrossRef]
53. Schick,T.;Udupa,S.;Schütze,H.Self‑DiagnosisandSelf‑Debiasing:AProposalforReducingCorpus‑BasedBiasinNLP.Trans.
Assoc.Comput.Linguist.2021,9,1408–1424.[CrossRef]
Disclaimer/Publisher’sNote: Thestatements,opinionsanddatacontainedinallpublicationsaresolelythoseoftheindividualau‑
thor(s)andcontributor(s)andnotofMDPIand/ortheeditor(s). MDPIand/ortheeditor(s)disclaimresponsibilityforanyinjuryto
peopleorpropertyresultingfromanyideas,methods,instructionsorproductsreferredtointhecontent.