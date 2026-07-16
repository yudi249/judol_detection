(IJACSA) International Journal of Advanced Computer Science and Applications,
Vol. 15, No. 8, 2024
Detecting Online Gambling Promotions on
Indonesian Twitter Using Text Mining Algorithm
Reza Bayu Perdana1, Ardin2, Indra Budi3, Aris Budi Santoso4, Amanah Ramadiah5, Prabu Kresna Putra6
Faculty of Computer Science, University of Indonesia, Jakarta, Indonesia1, 2, 3, 4, 5
Research Center for Data and Information Science, National Research and Innovation Agency, Bandung, Indonesia6
Abstract—This study addresses the pressing challenge of and widespread reach of social media platforms have
detecting online gambling promotions on Indonesian Twitter facilitated the dissemination of these illicit promotions,
using text mining algorithms for text classification and analytics. exacerbating concerns surrounding the detrimental effects of
Amid limited research on this subject, especially in the online gambling on vulnerable individuals, including minors
Indonesian context, we aim to identify common textual features and those with gambling addiction issues [7].
used in gambling promotions and determine the most effective
classification models. By analyzing a dataset of 6038 tweets Over the past 30 years, the internet has sparked profound
collected and using methods such as Random Forest, Logistic changes, presenting three primary challenges for gambling
Regression, and Convolutional Neural Networks, complemented marketing and public policy: (1) significant transformations in
by a comparison analysis of text representation methods, we the gambling industry's scale, scope, and nature; (2) a surge in
identified frequently occurring words such as 'link', 'situs', gambling advertising on social media; and (3) inadequate
'prediksi', 'jackpot', 'maxwin', and 'togel'. The results indicate methodologies for analyzing the extensive volume of online
that the combination of TF-IDF and Random Forest is the most advertising data [8]. Detecting online gambling promotions on
effective method for detecting online gambling promotion social media presents multifaceted challenges, ranging from
content on Indonesian Twitter, achieving a recall value of 0.958 identifying the numerous tactics employed by promoters to
and a precision value of 0.966. These findings can contribute to
evade detection to pinpointing the specific accounts engaging
cybersecurity and support law enforcement in mitigating the
in such activities. Moreover, discerning the nuanced
negative effects of such promotions, particularly on the Twitter
interactions and strategies utilized by these accounts adds
platform in Indonesia.
another layer of complexity to the detection process.
Traditional gambling advertising techniques have historically
Keywords—Social media; analytics; online gambling; intention
been inspected through manual content analysis [9] [10] [11].
classification
Despite offering detailed insights into specific content
I. INTRODUCTION characteristics, this approach is laborious and resource-
intensive, leading to significant constraints on sample sizes
In today's digital age, the landscape of social media
[12].
platforms has undergone significant evolution, becoming an
integral part of people's daily lives. Prominent social media In the face of these challenges, there exists an opportunity
accounts now have millions of followers [1], and they are to utilize cutting-edge technologies, especially artificial
utilized by various elements of society [2]. With billions of intelligence algorithms such as machine learning or deep
users worldwide, platforms such as Facebook, Twitter, learning with a text classification or text analytics approach, to
Instagram serve as virtual hubs where individuals connect, effectively address the widespread dissemination of online
share, and consume content. According to Digital 2024 Global gambling promotions [13]. By harnessing the power of
Overview Report [3], as of January 2024, internet users in machine learning, researchers can develop robust detection
Indonesia spent an average of 3 hours 11 minutes a day mechanisms capable of identifying and categorizing online
accessing social media. This duration is above the global gambling promotions with high accuracy. Therefore, the aim of
average of 2 hours 23 minutes, highlighting the strong this study is to answer these research questions (RQ):
attraction of social media for internet users in Indonesia.
 What textual features are commonly utilized in online
Unfortunately, the strong appeal of social media in gambling promotions on Indonesian Twitter?
Indonesia has also led to a dramatic increase in exploitation of
social media accounts for the promotion of online gambling in  How do classification models effectively perform in
recent years, posing substantial challenges to regulatory detecting online gambling promotion content in
authorities and law enforcement agencies. Online gambling Indonesian Twitter data?
promotion, particularly through social media platforms, has
This includes investigating the frequently used textual
emerged as a crucial strategy for reaching potential players [4].
features in online gambling promotions on Indonesian Twitter
The widespread accessibility of online gambling sites,
and determining the effectiveness of various text mining
operating 24/7, is evident [5]. Furthermore, the prevalence of
classification methods for detecting such content. Through this
online gambling promotions on social media is notable, with
study, we aim to provide significant insights into the common
influencers, social media personalities, and even celebrities
characteristics and patterns found in such promotional content,
actively engaging in such campaigns [6]. The ease of access
942 | P a ge
www.ijacsa.thesai.org

(IJACSA) International Journal of Advanced Computer Science and Applications,
Vol. 15, No. 8, 2024
as well as to identify the most effective classification Most of the studies we analyzed use English text data. For
algorithms for this context. We expect that the results will text analysis in the Indonesian context, several studies have
contribute to various aspects, including the development of demonstrated the application of various classification models
prevention strategies and regulations, enhancing cybersecurity and feature extraction techniques on Indonesian-language
measures, and preventing the spread of illegal content on social datasets. One notable study [30] utilized a Convolutional
media platforms. Furthermore, these findings are anticipated to Neural Network (CNN) alongside GloVe (Global Vectors) for
aid law enforcement efforts and protect social media users intent classification within the ATIS (Airline Travel
from the negative impacts of online gambling promotion. Information System) dataset, achieving a commendable
accuracy of 95.84%. In another study [31], the implementation
II. RELATED WORKS of Naive Bayes combined with TF-IDF was employed for the
Based on our literature review, discussions on the detection classification of terrorism-related content on Indonesian
of online gambling promotion content in social media are Twitter, attaining an F-measure of 77%. Setiawan's research
scarcely found. Therefore, we have endeavored to compile [32] applied Logistic Regression with Word2Vec for feature
knowledge related to the characteristics of similar content and extraction to detect spam posts on Indonesian Twitter, resulting
techniques used in previous studies. The literature we gathered in an accuracy of 93.67%. Additional research efforts in spam
covers topics including online gambling, spam detection, as detection on Indonesian Twitter include [33], which used
well as text classification and the detection of harmful content CountVectorizer and KNN to achieve an accuracy of 79%, and
users. another research [34], which employed CountVectorizer and
Random Forest, achieving an accuracy of 85.1%. These studies
In our exploration of online gambling, we have gained
underscore the versatility and effectiveness of different text
insights into textual features and common patterns found in
classification approaches within the Indonesian linguistic
gambling advertisements. Although studies [14] and [15] lack
framework.
detailed evaluation reports on advertisement classification,
study [14] reveals high-frequency words used in gambling ads, In advancing our research on the detection of online
suggesting a trend of positive language that highlights benefits, gambling promotion content in social media, we encounter
bonuses, and special deals, as observed across studies [7], several challenges that are crucial to address. These include the
[16]–[18]. Complementing this, study [7] specifically sheds determination of effective keywords for data retrieval from
light on the characteristics of online gambling ads in Indonesia, social media queries, streamlining the labeling processes, and
pointing out features such as bonuses, luck, financial gains, and the selection of appropriate models and textual features. The
the ease of joining. This finding aligns with our earlier need for precise keyword selection and labeling is particularly
literature review, which identified a scarcity of discussions on acute due to the limited data availability from Twitter
the detection of online gambling content, especially in following recent policy changes. To address this issue, we
Indonesia, underscoring the need for our comprehensive conducted descriptive analysis of frequently occurring words in
approach to understanding these promotional strategies. online gambling promotions on Indonesian Twitter to provide
insights into more effective search keyword identification. This
In our study, we have reviewed various approaches for text
analysis will precede the predictive analysis of training on
and spam classification. Predominant algorithms such as
classification models to detect such online gambling
Random Forest, Support Vector Machine (SVM), and Naïve
promotional content, aiming to develop an optimized approach
Bayes, particularly when integrated with N-Gram analysis
for our text mining processes.
[19][20], are favored for their reported high accuracy rates,
often exceeding 95%. Furthermore, applications of LSTM and III. METHODOLOGY
Word Sequence [21] are also considered effective alternatives,
In this research, we aim to conduct both descriptive and
achieving an accuracy rate of 88%. Other studies [22]–[24]
predictive analyses to gain a comprehensive understanding of
have explored RNN, manual analysis, and topic modeling,
online gambling promotion on Indonesian Twitter, thus
though their effectiveness evaluations are not explicitly
enhancing detection knowledge and capabilities. Our research
reported.
process, depicted in Fig. 1, initiates the identification of query
Focusing on spam classification, especially content keywords for Twitter data collection. Once keywords are
promoting gambling, many papers compare different selected, Twitter data retrieval is carried out. The accumulated
algorithms, preprocessing stages, and their evaluations. Studies data are labeled and then undergo pre-processing steps such as
[25] and [20] advocate the use of the SVM algorithm for spam tokenization, normalization, noise removal, and stemming.
detection, with study [20] achieving an F-Score of 96% Post-preprocessing, experiments are conducted as specified in
through bi-gram and TF-IDF preprocessing. Study [26] Table II to identify the optimal model for detecting online
employs a Thai BERT derivative, reaching an F-Score of 0.8, gambling content on Indonesian Twitter. The experimental
while other research, like study [27] using neural networks and outcomes are further discussed to interpret the findings.
GloVe, and study [28] employing logistic regression and Finally, conclusions and reports are drafted based on the
Word2Vec, report high F-Scores of 99.73% and 93%, discussions and analyses conducted, culminating in the
respectively. An alternative approach in study [29] utilizes research.
regex-based rules for spam detection, although it lacks detailed
evaluation.
943 | P a ge
www.ijacsa.thesai.org

(IJACSA) International Journal of Advanced Computer Science and Applications,
Vol. 15, No. 8, 2024
|     |     |     |     |     |     |     |     | TABLE I.  | EXAMPLE OF POSTS WITH ONLINE GAMBLING PROMOTION  |       |       |        |        |        |         |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --------- | ------------------------------------------------ | ----- | ----- | ------ | ------ | ------ | ------- | --- |
|     |     |     |     |     |     |     | No  |           |                                                  |       |       | Tweet  |        |        |         |     |
|     |     |     |     |     |     |     | 1   | DIMANA    |                                                  | LAGI  | CUMA  | MODAL  | KECIL  | DAPAT  | UNTUNG  |     |
BESAR KALAU BUKAN DI SGA338, TUNGGU APA LAGI ?
|     |     |     |     |     |     |     |     | AYO       | ...  | BURUAN         | DAFTAR  |     | SEKARANG  |         | JUGA   | DAN     |
| --- | --- | --- | --- | --- | --- | --- | --- | --------- | ---- | -------------- | ------- | --- | --------- | ------- | ------ | ------- |
|     |     |     |     |     |     |     |     | DAPATKAN  |      | KEMENANGANNYA  |         |     | !         |   INFO  | LEBIH  | LANUT   |
|     |     |     |     |     |     |     |     | DAPAT     |      | HUBUNGI        | KONTAK  |     | KAMI      |   NO    | HP     | WA  :   |
+6287815585xxx https://t.co/Y7OeIF7S35 https://t.co/qiJuNc88af
|     |     |     |     |     |     |     | 2   | INFO SLOT GACOR HARI INI  DAFTAR SLOT GACOR ➡️  |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
https://t.co/hnMWbSLliD https://t.co/2bCt8SCFyB

|     |     |     |     |     |     |     | 3   | 388HERO - Slot Paling Gacor Di Indonesia !!     ✅Bonus New  |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
Member 100%    ✅Garansi Kekalahan 100%       Daftar Slot Gacor
|     |     |     |     |     |     |     |     | Dan  | Claim  | Sekarang  |     | Juga  |   ️️️  |   https://t.co/jog4l9Jt0S  |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ---- | ------ | --------- | --- | ----- | ------ | -------------------------- | --- | --- |
https://t.co/RZTBrEyIYJ
|     |     |     |     |     |     |     | 4   | Gotobet88 berbagi thr lewat maxwin yang di persembahkan spesial  |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ---------------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
kepada member setia kami daftarkan diri anda segera di situs gacor
gampang maxwin kami  https://t.co/LgaCegaamG lewat @pinterest

|     |     |     |     |     |     |     | 5   | Jadwal pertandingan CSGO.  Ayo dukung jagoanmu dengan cara  |     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
gabung di WINGSLOTS77, boskiuh.  Raih kemenangan besar dengan
|     |     |     |     |     |     |     |     | cuan          | tiada  | batasnya.  |   Link  | Alternatif  |       | :  https://t.co/jdlSYjoZVS   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ------------- | ------ | ---------- | ------- | ----------- | ----- | ---------------------------- | --- | --- |
|     |     |     |     |     |     |     |     | #wingslots77  |        |            | #csgo   |             | #pgl  | #pglmajorcopenhagen          |     |     |
https://t.co/YffbGd4Ebe
Furthermore, we calculated the inter-annotator agreement
using Cohen’s Kappa coefficient.
|     |     |     |     |     |     |     |     | To  | address  | any  | disagreements  |     | between  |     | annotators,  | a   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | -------- | ---- | -------------- | --- | -------- | --- | ------------ | --- |
reconciliation process was implemented. Disagreements were
discussed in a joint session between the annotators, and if

consensus could not be reached, a third expert annotator was
Fig. 1.  Proposed workflow of this study.
brought in to make the final decision. This process ensured a
Keyword  query  determination  aims  to  ensure  effective  thorough review and maintained consistency in labeling.
retrieval from Twitter searches. In identifying keywords, we
Descriptive analysis is conducted to depict the nature of
| refer  to  | previous  | research  | on  | general  online  |     | gambling  |     |     |     |     |     |     |     |     |     |     |
| ---------- | --------- | --------- | --- | ---------------- | --- | --------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
online gambling content more comprehensively on Indonesian
promotion, characterized by a positive tone and suggestive of
Twitter and aim to answer RQ 1. The steps for descriptive
benefits and ease [7], [14]. Based on [7] and other studies
analysis derive from the study of online gambling content on
published online [35], we use the query string "(slot OR gacor
Facebook [35], including temporal analysis, interaction count
OR untung OR cuan) lang:id" to collect Indonesian Twitter
|                      |     |         |           |           |     |            | analysis,  |     | and  | examination  |     | of  frequently  |     | occurring  |     | words  |
| -------------------- | --- | ------- | --------- | --------- | --- | ---------- | ---------- | --- | ---- | ------------ | --- | --------------- | --- | ---------- | --- | ------ |
| samples  containing  |     | online  | gambling  | content.  | We  | target  a  |            |     |      |              |     |                 |     |            |     |        |
besides search keywords, analyzed using a word cloud.
| minimum  | of  5000  | Indonesian  | language  | tweet  | samples  | for  |     |     |     |     |     |     |     |     |     |     |
| -------- | --------- | ----------- | --------- | ------ | -------- | ---- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
further analysis.  Predictive analysis aims to develop a classification model
|     |     |     |     |     |     |     | that  | detects  | online  |     | gambling  | promotional  |     | posts  | from  | the  |
| --- | --- | --- | --- | --- | --- | --- | ----- | -------- | ------- | --- | --------- | ------------ | --- | ------ | ----- | ---- |
Upon sample data acquisition, data labeling ensues. We
available dataset as the answer to RQ 2. After labeling, the data
employ two annotators who have agreed upon the criteria for
is tokenized, normalized, noise is removed, and stemming is
| what  constitutes  |     | online  gambling  |     | promotion  | content,  | with  |     |     |     |     |     |     |     |     |     |     |
| ------------------ | --- | ----------------- | --- | ---------- | --------- | ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
conducted. The feature extraction and modeling phases, which
examples outlined in Table I. The labeled data is then utilized
determine the best algorithm for detecting online gambling
for both descriptive and predictive analyses. In determining the
|     |     |     |     |     |     |     | promotion,  |     | are  | conducted  |     | through  | experiments  |     | listed  | in  |
| --- | --- | --- | --- | --- | --- | --- | ----------- | --- | ---- | ---------- | --- | -------- | ------------ | --- | ------- | --- |
label of a tweet, we provided clear labeling criteria to both
Table II. Algorithm selection for experimentation is based on
annotators to minimize inconsistencies. A tweet was labeled as
previous research [30], [32], [34].
containing online gambling promotional content if it met one
or more of the following criteria:  The selection of algorithms for this study was carefully
considered to match the unique challenges presented by the
  Explicitly inviting individuals to participate in online
|     |     |     |     |     |     |     | task  | of  | detecting  | online  | gambling  |     | promotions  |     | on  | Twitter.  |
| --- | --- | --- | --- | --- | --- | --- | ----- | --- | ---------- | ------- | --------- | --- | ----------- | --- | --- | --------- |
gambling activities,
Given the informal and varied nature of Twitter text, including
|                |     |            |        |             |     |           | the              | use  | of  slang  | and          | abbreviations,  |     | Convolutional      |     |             | Neural  |
| -------------- | --- | ---------- | ------ | ----------- | --- | --------- | ---------------- | ---- | ---------- | ------------ | --------------- | --- | ------------------ | --- | ----------- | ------- |
|   Displaying  |     | links  or  | names  | of  online  |     | gambling  |                  |      |            |              |                 |     |                    |     |             |         |
|                |     |            |        |             |     |           | Networks (CNNs)  |      |            | were chosen  |                 |     | for their ability  |     | to capture  |         |
platforms,
complex patterns and contextual nuances within text. Random
  Showing results from online gambling activities,
Forest was selected due to its effectiveness in handling high-
dimensional data and its resistance to overfitting, which is
  Providing instructions on how to join online gambling
essential when dealing with diverse textual features. Logistic
activities.
|     |     |     |     |     |     |     | Regression  |     | was  | included  |     | for  its  | interpretability  |     | and     | as  a  |
| --- | --- | --- | --- | --- | --- | --- | ----------- | --- | ---- | --------- | --- | --------- | ----------------- | --- | ------- | ------ |
|     |     |     |     |     |     |     |             |     |      |           |     |           |                   |     | 944 | P | a ge   |
www.ijacsa.thesai.org

(IJACSA) International Journal of Advanced Computer Science and Applications,
Vol. 15, No. 8, 2024
baseline model to compare performance, as it is widely used in  promotion content, and a label of "0" if the post did not contain
text  classification  tasks.  This  combination  of  models  was  such content. The annotation results were then evaluated using
intended  to  leverage  the  strengths  of  each  algorithm  in  Cohen’s  Kappa  coefficient,  with  the  matrix  presented  in
| addressing  | different  | facets  | of  | the  data,  | ensuring  |     | a  robust  | Table III.  |     |     |     |     |     |
| ----------- | ---------- | ------- | --- | ----------- | --------- | --- | ---------- | ----------- | --- | --- | --- | --- | --- |
analysis of the factors contributing to the detection of online
gambling promotions.  TABLE III.  ANNOTATION EVALUATION MATRIX
Evaluations  are  performed  using  a  confusion  matrix,  Label  Label 0 (Annotator  Label 1 (Annotator
focusing on recall and F-measure to minimize the potential  B)  B)
|     |     |     |     |     |     |     |     | Label 0 (Annotator A)  |     |     | 4308  | 41  |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ---------------------- | --- | --- | ----- | --- | --- |
oversight of online gambling content by the model. Due to the
lack  of  reported  training  times  in  related  studies,  a  direct  Label 1 (Annotator A)  42  1647
comparison of computational efficiency between our model
| and  those  | presented  |     | in  [30],  | [32],  | and  [34]  | cannot  | be  |     |     |     |     |     |     |
| ----------- | ---------- | --- | ---------- | ------ | ---------- | ------- | --- | --- | --- | --- | --- | --- | --- |
Based on Table III, the Cohen’s Kappa coefficient from the
conducted. Nevertheless, our results highlight the importance
evaluation is 0.9659, indicating an almost perfect agreement
of including training time as a key metric for evaluating model  between  the  annotators  [36].  This  result  suggests  that  the
performance,  especially  in  contexts  where  computational  labeled data can be used for the next steps in the analysis,
resources are limited. We chose the F1 score and Recall as our  which include descriptive analysis and data preprocessing. The
primary evaluation metrics due to their relevance in contexts  comparison of the label counts for each category is shown in
with imbalanced data. Recall is particularly important because
Fig. 2 that shows the imbalanced dataset as labeling results.
it measures the model's ability to correctly identify all instances
|          |           |         |        |              |               |     |         | Our  | approach  | reflects  | a  realistic  | scenario  where  | data  |
| -------- | --------- | ------- | ------ | ------------ | ------------- | --- | ------- | ---- | --------- | --------- | ------------- | ---------------- | ----- |
| of  the  | minority  | class,  | which  | is  crucial  | in detecting  |     | online  |      |           |           |               |                  |       |
imbalance is common, and practitioners may not always have
| gambling  | promotions.  |     | The  F1  | score  | provides  | a   | balanced  |                  |     |               |           |                      |     |
| --------- | ------------ | --- | -------- | ------ | --------- | --- | --------- | ---------------- | --- | ------------- | --------- | -------------------- | --- |
|           |              |     |          |        |           |     |           | the opportunity  |     | or resources  | to apply  | complex rebalancing  |     |
measure of both precision and recall, offering insight into the
model's performance in minimizing false positives while still  techniques.  By  evaluating  model  performance  on  the  raw,
capturing true positives. These metrics were selected to ensure  imbalanced data,  we  aimed  to  identify  algorithms  that  are
naturally resilient to such conditions. This decision was based
| that  the  | chosen  | model  | performs  | effectively  |     | even  | in  the  |     |     |     |     |     |     |
| ---------- | ------- | ------ | --------- | ------------ | --- | ----- | -------- | --- | --- | --- | --- | --- | --- |
on the need to assess the practical utility of the models in
presence of class imbalance.
environments where preprocessing capabilities may be limited.
| Once      | the            | optimal  | model        | is  identified  |     | and  descriptive  |       |     |     |     |     |     |     |
| --------- | -------------- | -------- | ------------ | --------------- | --- | ----------------- | ----- | --- | --- | --- | --- | --- | --- |
| analysis  | is  complete,  |          | the  report  | writing         | is  | finalized         | with  |     |     |     |     |     |     |
discussions and conclusions.
|             |     | TABLE II.  | EXPERIMENTAL LIST    |     |     |            |     |     |     |     |     |     |     |
| ----------- | --- | ---------- | -------------------- | --- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
| Experiment  |     |            | Text Representation  |     |     | Algorithm  |     |     |     |     |     |     |     |
| 1           |     | GloVe      |                      |     |     | CNN        |     |     |     |     |     |     |     |
| 2           |     | GloVe      |                      |     |     | LR         |     |     |     |     |     |     |     |
| 3           |     | GloVe      |                      |     |     | RF         |     |     |     |     |     |     |     |
| 4           |     | Word2Vec   |                      |     |     | CNN        |     |     |     |     |     |     |     |
| 5           |     | Word2Vec   |                      |     |     | LR         |     |     |     |     |     |     |     |
| 6           |     | Word2Vec   |                      |     |     | RF         |     |     |     |     |     |     |     |
| 7           |     | TF-IDF     |                      |     |     | CNN        |     |     |     |     |     |     |     |
| 8           |     | TF-IDF     |                      |     |     | LR         |     |     |     |     |     |     |     |

| 9      |        | TF-IDF  |             |          |           | RF  |           |     |     |          |                    |     |     |
| ------ | ------ | ------- | ----------- | -------- | --------- | --- | --------- | --- | --- | -------- | ------------------ | --- | --- |
|        |        |         |             |          |           |     |           |     |     | Fig. 2.  | Number of labels.  |     |     |
| These  | steps  | form    | the  basis  | of  our  | proposed  |     | research  |     |     |          |                    |     |     |
methodology, which aims to address the intricacies of detecting  We then proceeded with temporal analysis by visualizing
online  gambling  promotions  in  social  media  content  the number of tweets labeled "1" per hour. The visualization
effectively.  results,  as  shown  in  Fig.  3,  indicate  that  online  gambling
promotion content is often posted during the early morning and
IV.  RESULTS AND DISCUSSIONS  late afternoon to evening hours.
We successfully collected 6,038 Twitter data points based
|     |     |     |     |     |     |     |     | Interactions  |     | with  | tweets  containing  | online  gambling  |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ------------- | --- | ----- | ------------------- | ----------------- | --- |
on the predetermined keywords. This result exceeds our target
|     |     |     |     |     |     |     |     | promotion  | content  | are  | relatively  | high,  averaging  | 1.68  |
| --- | --- | --- | --- | --- | --- | --- | --- | ---------- | -------- | ---- | ----------- | ----------------- | ----- |
of 5,000 Twitter data points, allowing us to proceed with data
interactions per tweet, including quotes, replies, retweets, or
annotation.  favorites. This is five times higher than the average interactions
per tweet labeled "0," which is 0.38 interactions per tweet.
The data annotation was carried out by two annotators
working  independently.  The  annotation  process  involved  Three accounts with usernames indicative of online gambling
assigning a label of "1" if the post contained online gambling  operators  have  average  interactions  of  36,  29,  and  24
interactions per tweet. This indicates that accounts and posts
|     |     |     |     |     |     |     |     |     |     |     |     | 945 | P | a ge   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- | ------ |
www.ijacsa.thesai.org

(IJACSA) International Journal of Advanced Computer Science and Applications,
Vol. 15, No. 8, 2024
containing  online  gambling  promotion  content  attract  TABLE IV.  RESULT EXAMPLE OF BACK-TRANSLATION METHOD
significant attention from Twitter users.
|     |     |     |     |     | Raw Data      | English Translation  |       |     |     | Indonesian Back-  |     |     |
| --- | --- | --- | --- | --- | ------------- | -------------------- | ----- | --- | --- | ----------------- | --- | --- |
|     |     |     |     |     | (Indonesian)  |                      | Data  |     |     | Translation Data  |     |     |
Situs  SABDA4D
|     |     |     |     |     | t3rbaik     | dan      |          |            |                            |     |     |            |
| --- | --- | --- | --- | --- | ----------- | -------- | -------- | ---------- | -------------------------- | --- | --- | ---------- |
|     |     |     |     |     |             | The      | best     | and  most  |                            |     |     |            |
|     |     |     |     |     | t3rperc4ya  | di       |          |            |                            |     |     |            |
|     |     |     |     |     |             | trusted  | SABDA4D  |            | Situs SABDA4D terbaik dan  |     |     |            |
|     |     |     |     |     | 1ndon3sia   | site     | in       | Indonesia  | terpercaya                 |     | di  | Indonesia  |
m3ny3di4kan
|     |     |     |     |     |     | offers  | the  | most  | menawarkan permainan dan  |     |     |     |
| --- | --- | --- | --- | --- | --- | ------- | ---- | ----- | ------------------------- | --- | --- | --- |
g4mes  t3rlengkap
|     |     |     |     |     |     | complete and popular  |     |     | RTP  | slot  | &  pol4  | g4cor  |
| --- | --- | --- | --- | --- | --- | --------------------- | --- | --- | ---- | ----- | -------- | ------ |
d4n  t3rpopuler
|     |     |     |     |     |                     | games and RTP slots  |        |        | terlengkap                 |     | dan  terpopuler  |         |
| --- | --- | --- | --- | --- | ------------------- | -------------------- | ------ | ------ | -------------------------- | --- | ---------------- | ------- |
|     |     |     |     |     | s3rta  RTP          | slot                 |        |        |                            |     |                  |         |
|     |     |     |     |     |                     | & pol4 g4cor every   |        |        | setiap jamnya! Bonus D3po  |     |                  |         |
|     |     |     |     |     | &amp                |   pol4               |        |        |                            |     |                  |         |
|     |     |     |     |     |                     | hour!                | D3po   | bonus  | 200k                       |     | p4ka1            | l1nk    |
|     |     |     |     |     | g4cornya t3rupd4te  | 200k                 | p4ka1  | l1nk   | m4xwinny4:                 |     |                  | {LINK}  |
s3tiap j4m ! bonu5
|     |     |     |     |     |             | m4xwinny4: {LINK}  |     |     | {LINK}  |     |     |     |
| --- | --- | --- | --- | --- | ----------- | ------------------ | --- | --- | ------- | --- | --- | --- |
|     |     |     |     |     | D3po  200k  | p4ka1              |     |     |         |     |     |     |
{LINK}
l1nk m4xwinny4 :
  {LINK} {LINK}
Fig. 3.  Temporal distribution of labeled "1" data.
The next steps we undertook included removing stopwords,
replacing slang words, removing extra characters in words,
We then conducted a word cloud analysis to identify the
converting emojis to phrases, removing usernames, removing
most frequently occurring words in tweets containing online
gambling promotion content. As shown in Fig. 4, in addition to  numbers,  removing  punctuation,  and  converting  text  to
the search keywords, words such as "link," "situs," "prediksi,"  lowercase. During this data cleaning process, we encountered
"jackpot,"  "maxwin,"  and  "togel"  were  identified  as  being  several challenges, including the use of slang, symbols, and
local languages that were occasionally embedded in sentences
| affiliated  with  | posts  | containing  | online  gambling  | promotion  |     |     |     |     |     |     |     |     |
| ----------------- | ------ | ----------- | ----------------- | ---------- | --- | --- | --- | --- | --- | --- | --- | --- |
written in Indonesian. As a result, we also conducted manual
content.
|     |     |     |     |     | cleaning  | to  ensure  | that  the  | data  | included  | in  | the  modeling  |     |
| --- | --- | --- | --- | --- | --------- | ----------- | ---------- | ----- | --------- | --- | -------------- | --- |
process was accurate. Additionally, we applied stemming to
revert words to their root forms. An example of the outcomes
from these processes are presented in Table V.
|     |     |     |     |     | TABLE V.                            | RESULT EXAMPLE OF DATA PREPROCESSING  |             |                                        |     |               |     |     |
| --- | --- | --- | --- | --- | ----------------------------------- | ------------------------------------- | ----------- | -------------------------------------- | --- | ------------- | --- | --- |
|     |     |     |     |     |                                     | Initial Data                          |             |                                        |     | Cleaned Data  |     |     |
|     |     |     |     |     | Situs  SABDA4D                      | terbaik                               | dan         | situs sabda d baik percaya indonesia   |     |               |     |     |
|     |     |     |     |     | terpercaya di Indonesia menawarkan  |                                       |             | sedia game rtp slot pola gacor update  |     |               |     |     |
|     |     |     |     |     | permainan                           | dan  RTP  slot                        | &  pol4     | per jam lengkap populer bonus          |     |               |     |     |
|     |     |     |     |     | g4cor  terlengkap                   | dan                                   | terpopuler  |                                        |     |               |     |     |
|     |     |     |     |     | setiap  jamnya!                     | Bonus  D3po                           | 200k        |                                        |     |               |     |     |
|     |     |     |     |     | p4ka1  l1nk                         | m4xwinny4:                            | {LINK}      |                                        |     |               |     |     |
{LINK}
After completing these processes, we initiated the modeling
|     |     |     |     |     | process  | as  outlined  | in  Table  | II,  | starting  | with  | document  |     |
| --- | --- | --- | --- | --- | -------- | ------------- | ---------- | ---- | --------- | ----- | --------- | --- |
vectorization.
The experimental results using nine scenarios, as shown in
Table VI, indicate that the combination of GloVe and CNN
|     |     |     |     |     | demonstrates  | excellent  | performance  |     | across  |     | all  evaluation  |     |
| --- | --- | --- | --- | --- | ------------- | ---------- | ------------ | --- | ------- | --- | ---------------- | --- |

metrics, albeit with a relatively high training time. The high
Fig. 4.  Wordcloud of labeled "1" data.
recall and precision values indicate that this model is highly
effective in detecting tweets that genuinely promote online
We then proceeded with data preprocessing for modeling.
|     |     |     |     |     | gambling  | and  minimizing  |     | false  | positives.  | In  | contrast,  | the  |
| --- | --- | --- | --- | --- | --------- | ---------------- | --- | ------ | ----------- | --- | ---------- | ---- |
We employed a back-translation method for data normalization
combination of GloVe and Logistic Regression performs very
[37]. In this process, we translated the documents into English
poorly, especially in terms of recall and F1 score, indicating
| and then retranslated  |     | them  | back  into Indonesian  | using the  |             |            |                          |     |     |         |           |     |
| ---------------------- | --- | ----- | ---------------------- | ---------- | ----------- | ---------- | ------------------------ | --- | --- | ------- | --------- | --- |
|                        |     |       |                        |            | that  this  | model  is  | inadequate at detecting  |     |     | online  | gambling  |     |
Google Translate API. This approach ensures that words with
promotion tweets. Random Forest with GloVe shows good
the same meaning are standardized and helps avoid spelling
performance but is not as effective as CNN. This model has
errors in Indonesian. We present an example of the outcomes
|                              |     |          |            |                   | lower  recall  | but  | is  still  | reasonably  |     | good  | at  detecting  |     |
| ---------------------------- | --- | -------- | ---------- | ----------------- | -------------- | ---- | ---------- | ----------- | --- | ----- | -------------- | --- |
| from  the  back-translation  |     | process  | in  Table  | IV.  This  table  |                |      |            |             |     |       |                |     |
promotional tweets.
includes an example of data labeled as '1' or 'online gambling
promotion,' due to its explicit promotion of an online gambling
| site.  Our  back-translation  |     | process  | successfully  | reduced  the  |     |     |     |     |     |     |     |     |
| ----------------------------- | --- | -------- | ------------- | ------------- | --- | --- | --- | --- | --- | --- | --- | --- |
noise present in the raw data.
|     |     |     |     |     |     |     |     |     |     |     | 946 | P | a ge   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- | ------ |
www.ijacsa.thesai.org

(IJACSA) International Journal of Advanced Computer Science and Applications,
Vol. 15, No. 8, 2024
|     |     |     |     |     | TABLE VI.  | RESULTS OF EXPERIMENT'S SCENARIO  |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | ---------- | --------------------------------- | --- | --- | --- | --- | --- | --- | --- |
Vectorizer  Algorithm  Accuracy  AUC  Recall  Precision  F1 Score  Kappa  MCC  Training Time
GloVe  CNN  0.97462  0.99517  0.94268  0.96493  0.95363  0.93612  0.93632  7.81112
GloVe  LR  0.72162  0.61804  0.08757  0.51136  0.14749  0.07424  0.11495  0.07246
GloVe  RF  0.93234  0.97619  0.80093  0.9492  0.86824  0.82316  0.82899  0.54267
TF-IDF  CNN  0.71799  0.74627  0.16888  0.48671  0.24517  0.12366  0.15008  8.037
TF-IDF  LR  0.97463  0.99434  0.94542  0.96326  0.95414  0.93655  0.93677  0.02478
TF-IDF  RF  0.97878  0.99419  0.95829  0.96572  0.96183  0.94711  0.94726  0.63892
Word2Vec  CNN  0.97082  0.9939  0.94344  0.95303  0.94759  0.92736  0.92798  4.12421
Word2Vec  LR  0.93732  0.98075  0.86085  0.911  0.88469  0.84168  0.8428  0.04422
Word2Vec  RF  0.96119  0.9902  0.92247  0.9376  0.92967  0.90286  0.9032  2.06679
difference between the performance of TF-IDF with RF and
| The  | combination  | of  | TF-IDF  | and  | CNN  shows  | poor  |     |     |     |     |     |     |     |
| ---- | ------------ | --- | ------- | ---- | ----------- | ----- | --- | --- | --- | --- | --- | --- | --- |
Word2Vec with CNN,” and the alternative hypothesis (H1)
performance, particularly in recall and F1 score, indicating that
was “There is a significant difference between the performance
| this  model  | is  | less  effective  | in  | detecting  | online  | gambling  |     |     |     |     |     |     |     |
| ------------ | --- | ---------------- | --- | ---------- | ------- | --------- | --- | --- | --- | --- | --- | --- | --- |
of TF-IDF with RF and Word2Vec with CNN.”
promotion tweets. The combination of TF-IDF and Logistic
Regression  demonstrates  excellent  performance,  similar  to  We performed hypothesis tests on two model evaluation
GloVe-CNN,  but  with  significantly  lower  training  time,  metrics: Recall and F1 Score. The results of these hypothesis
making it more efficient. Random Forest with TF-IDF shows  tests are presented in Table VII.
the best performance among all combinations, with very high
evaluation metrics and still relatively efficient training time.  TABLE VII.  HYPOTHESIS TEST RESULTS FOR RECALL AND F1 SCORE
The  combination  of  Word2Vec  and  CNN  demonstrates  alpha  p-value  Results

excellent performance, approaching the performance of GloVe- Fail to reject H0: No significant
|     |     |     |     |     |     |     | Recall  | 0.05  | 0.130  |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ------- | ----- | ------ | --- | --- | --- | --- |
CNN but with lower training time. Logistic Regression with  difference
Word2Vec shows good performance, though not as strong as  F1 Score  0.05  0.047  Reject H0: Significant difference
the other top combinations. It’s very low training time makes
this model highly efficient. Random Forest with Word2Vec  Table VII shows that the p-value for the recall metric is
shows excellent performance, slightly below the performance  0.130, which is greater than the significance level of 0.05.
of  TF-IDF  with  Random  Forest.  This  model  is  still  very  Therefore, we fail to reject the null hypothesis. This indicates
|     |     |     |     |     |     |     | that  there  | is  | no  statistically  | significant  |     | difference  | in  recall  |
| --- | --- | --- | --- | --- | --- | --- | ------------ | --- | ------------------ | ------------ | --- | ----------- | ----------- |
effective in detecting promotional tweets, with lower training
between the TF-IDF + RF model and the Word2Vec + CNN
time compared to TF-IDF with CNN.
model. In other words, both models perform similarly in terms
| Overall,  | the  | combination  | of  | TF-IDF  | with  the  | Random  |     |     |     |     |     |     |     |
| --------- | ---- | ------------ | --- | ------- | ---------- | ------- | --- | --- | --- | --- | --- | --- | --- |
of recall. The recall metric measures the ability of the model to
Forest algorithm provides the best performance in identifying
|     |     |     |     |     |     |     | correctly  | identify  | all  | relevant instances  |     | of online  | gambling  |
| --- | --- | --- | --- | --- | --- | --- | ---------- | --------- | ---- | ------------------- | --- | ---------- | --------- |
online gambling promotion content. The Recall value of 95.8%
|     |     |     |     |     |     |     | promotion.  | The  | lack  | of  a  significant  |     | difference  | in  recall  |
| --- | --- | --- | --- | --- | --- | --- | ----------- | ---- | ----- | ------------------- | --- | ----------- | ----------- |
indicates that the TF-IDF with RF combination can minimize  suggests that both models are equally effective in identifying
false negatives. The high Precision value of 96.6% shows that  true  positive  instances  of  online  gambling  promotions  on
this combination effectively avoids false positives. This is also
|     |     |     |     |     |     |     | Indonesian  | Twitter.  |     | This  could  | imply  | that  | both  text  |
| --- | --- | --- | --- | --- | --- | --- | ----------- | --------- | --- | ------------ | ------ | ----- | ----------- |
supported by a high MCC value and moderate training time.
|     |     |     |     |     |     |     | representation  |     | methods  | (TF-IDF  | and  | Word2Vec)  | and  |
| --- | --- | --- | --- | --- | --- | --- | --------------- | --- | -------- | -------- | ---- | ---------- | ---- |
classification algorithms (RF and CNN) are similarly proficient
| TF-IDF  | with  | Logistic  | Regression  |     | and  Word2Vec  | with  |     |     |     |     |     |     |     |
| ------- | ----- | --------- | ----------- | --- | -------------- | ----- | --- | --- | --- | --- | --- | --- | --- |
in capturing the relevant features needed for high recall in this
| Logistic  | Regression  | show  | a   | good  | balance  between  | high  |     |     |     |     |     |     |     |
| --------- | ----------- | ----- | --- | ----- | ----------------- | ----- | --- | --- | --- | --- | --- | --- | --- |
context.
performance and very low training time. GloVe with Logistic
Regression and TF-IDF with CNN demonstrate significantly
The p-value for the F1 score metric is 0.047, which is less
lower performance and are not recommended for detecting
than the significance level of 0.05. Therefore, we reject the null
online gambling promotion tweets.  hypothesis. This indicates that there is a statistically significant
difference in F1 score between the TF-IDF + RF model and the
| We  | conducted  | hypothesis  |     | testing  | based  on  | the  results  |     |     |     |     |     |     |     |
| --- | ---------- | ----------- | --- | -------- | ---------- | ------------- | --- | --- | --- | --- | --- | --- | --- |
presented in Table IV to determine if there is a significant  Word2Vec  +  CNN  model.  Specifically,  the  TF-IDF  +  RF
difference  between  the  performance  of  the  TF-IDF  with  model has a significantly better F1 score compared to the
Random  Forest (RF) combination and  the Word2Vec with  Word2Vec + CNN model. The F1 score is a harmonic means
of precision and recall, providing a balance between the two.
| Convolutional  |     | Neural  | Network  | (CNN)  | combination.  | This  |     |     |     |     |     |     |     |
| -------------- | --- | ------- | -------- | ------ | ------------- | ----- | --- | --- | --- | --- | --- | --- | --- |
The significant difference in F1 score, favoring the TF-IDF +
| analysis  | was  | undertaken  | because  |     | both  combinations  |     |     |     |     |     |     |     |     |
| --------- | ---- | ----------- | -------- | --- | ------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
RF model, indicates that this model not only identifies true
| demonstrated  | high  | Recall  | and  | F1  Score  | with  | acceptable  |     |     |     |     |     |     |     |
| ------------- | ----- | ------- | ---- | ---------- | ----- | ----------- | --- | --- | --- | --- | --- | --- | --- |
training times, along with the difference in text vectorization’s  positives effectively (recall) but also minimizes false positives
method. The null hypothesis (H0) was “There is no significant  (precision). The higher F1 score suggests that TF-IDF + RF
strikes a better balance between precision and recall compared
|     |     |     |     |     |     |     |     |     |     |     |     |     | 947 | P a ge   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | -------------- |
www.ijacsa.thesai.org

(IJACSA) International Journal of Advanced Computer Science and Applications,
Vol. 15, No. 8, 2024
to Word2Vec + CNN, making it a more reliable model for this  ACKNOWLEDGMENT
task.
This paper is the original work of the authors, Reza Bayu
Compared to the previous studies we use for reference,  Perdana,  Ardin,  Aris  Budi  Santoso,  Prabu  Kresna  Putra,
although the exact training times were not reported, the studies  Amanah Ramadiah, and Indra Budi, all of whom contributed
[30], [32], and [34] utilized models such as Random Forest and  significantly to the research, analysis, and writing of this study.
SVM,  which  are  known  for  their  differing  computational  We declare that no part of this work has been plagiarized, and
complexities. Random Forest, for example, often requires more  it represents the authors' authentic efforts in addressing the
computational resources due to the ensemble nature of the
|     |     |     |     |     |     |     |     | challenge  | of  detecting  |     | online  | gambling  |     | promotions  | on  |
| --- | --- | --- | --- | --- | --- | --- | --- | ---------- | -------------- | --- | ------- | --------- | --- | ----------- | --- |
algorithm,  compared  to  a  single-layer  SVM  model.  By  Indonesian Twitter.
contrast, our study's use of a TF-IDF combined with Random
The writing of this scientific paper was supported by the
Forest may offer a more balanced trade-off between accuracy
University of Indonesia and the Meteorology, Climatology, and
and computational efficiency.
|     |     |     |     |     |     |     |     | Geophysics  | Agency  | (BMKG),  |     | with  | funding  | provided  | by  |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------- | ------- | -------- | --- | ----- | -------- | --------- | --- |
V.  CONCLUSION  BMKG as part of a scholarship to improve the quality of
|      |             |     |              |        |        |               |     | human  | resources  | managed  | by  | the  | BMKG  | Education  | and  |
| ---- | ----------- | --- | ------------ | ------ | ------ | ------------- | --- | ------ | ---------- | -------- | --- | ---- | ----- | ---------- | ---- |
| The  | conclusion  | of  | this  study  | shows  | that,  | based on the  |     |        |            |          |     |      |       |            |      |
Training Center and also provided by Faculty of Computer
analysis, textual features commonly utilized in online gambling
|             |     |             |          |          |        |       |     | Science   | University  | of        | Indonesia  | by  | Hibah      | Riset  Internal  |      |
| ----------- | --- | ----------- | -------- | -------- | ------ | ----- | --- | --------- | ----------- | --------- | ---------- | --- | ---------- | ---------------- | ---- |
| promotions  | on  | Indonesian  | Twitter  | include  | words  | such  | as  |           |             |           |            |     |            |                  |      |
|             |     |             |          |          |        |       |     | Fakultas  | Ilmu        | Komputer  | UI         | TA  | 2024-2025  | No.              | NKB- |
"link," "situs," "prediksi," "jackpot," "maxwin," and "togel."
6/UN2.F2.D/NKP.05.00/2024.
These words frequently appear in online gambling content on
Twitter. This indicates that these words are effective textual  REFERENCES
| features  | for  | detecting  | online  | gambling  | promotions  |     | on  |     |     |     |     |     |     |     |     |
| --------- | ---- | ---------- | ------- | --------- | ----------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
[1]
Indonesian Twitter, in addition to the initial textual features we  S.  Wu  and  D.  Peng,  “Pre-SMATS:  A  multi-task  learning  based
prediction model for small multi-stage seasonal time series,” Expert
used as keywords in our query string. Furthermore, the results  Syst. Appl., vol. 201, 2022, doi: 10.1016/j.eswa.2022.117121.
of  the  classification  model  training  indicate  that  the  [2]   X. Y. Leung, B. Bai, and K. A. Stahura, “The marketing effectiveness of
combination  of  TF-IDF  and  Random  Forest  is  the  most  social media in the hotel industry: A comparison of Facebook and
effective  method  for  detecting  online  gambling  promotion  Twitter,” J. Hosp. Tour. Res., vol. 39, no. 2, pp. 147–169, 2015.
content on Indonesian Twitter. With a recall value of 95.8%  [3]   Datareportal,  “Digital  2024:  Global  Overview  Report,”  2024.
and a precision value of 96.6%, this combination significantly  https://datareportal.com/reports/digital-2024-global-overview-report
(accessed Jun. 01, 2024).
minimizes false negative and positive detections. This research
|        |                |     |               |     |                   |     |     | [4]   A.  Sudibyo,  |     | Media  Massa  | Nasional  | Menghadapi  |     | Disrupsi  | Digital.  |
| ------ | -------------- | --- | ------------- | --- | ----------------- | --- | --- | ------------------- | --- | ------------- | --------- | ----------- | --- | --------- | --------- |
| makes  | an  important  |     | contribution  | to  | the  development  |     | of  |                     |     |               |           |             |     |           |           |
Kepustakaan Populer Gramedia, 2023.
strategies for preventing and regulating illegal content on social
|     |     |     |     |     |     |     |     | [5]   I. Y. Nono, A. A. S. L. Dewi, and I. P. G. Seputra, “Penegakan Hukum  |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --------------------------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- |
media and supports law enforcement efforts in addressing the
|     |     |     |     |     |     |     |     | Terhadap  | Selebgram  | yang  | Mempromosikan  |     | Situs  | Judi  Online,”  | J.  |
| --- | --- | --- | --- | --- | --- | --- | --- | --------- | ---------- | ----- | -------------- | --- | ------ | --------------- | --- |
negative impacts of online gambling promotion.
Analog. Huk., vol. 3, no. 2, pp. 235–239, 2021.
|        |      |        |          |                |         |           |     | [6]   S. Desriwaty, “Pertanggungjawaban Pidana terhadap Pelaku Promosi  |     |     |     |     |     |     |     |
| ------ | ---- | ------ | -------- | -------------- | ------- | --------- | --- | ----------------------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- |
| While  | our  | study  | focuses  | on  detecting  | online  | gambling  |     |                                                                         |     |     |     |     |     |     |     |
Judi Online yang dilakukan melalui Media Sosial ditinjau dari Perspektif
promotions on Indonesian Twitter, the proposed methodology
Hukum Pidana.” Prodi Ilmu Hukum, 2023.
| could  potentially  |                | be  | generalized       | to  | other  languages  |                | and  |               |           |     |             |              |     |              |         |
| ------------------- | -------------- | --- | ----------------- | --- | ----------------- | -------------- | ---- | ------------- | --------- | --- | ----------- | ------------ | --- | ------------ | ------- |
|                     |                |     |                   |     |                   |                |      | [7]   M.  S.  | Gunawan,  | N.  | Mujahidah,  | S.  Sofyan,  |     | and  M.  A.  | M.  A,  |
| platforms.          | For instance,  |     | the tokenization  |     | and               | normalization  |      |               |           |     |             |              |     |              |         |
“Pertanggungjawaban Platfom Media Sosial Terhadap Promosi Judi
processes would need adjustments to account for linguistic  Online,” J. Plaza Huk. Indones., vol. 1, no. 19, pp. 1–15, 2023.
differences in languages like Japanese or Arabic. Furthermore,  [8]   O. Burkeman, “Forty years of the internet: How the world changed
the high variability in content length and user behavior across  forever,” Guard., vol. 23, 2009.
platforms  like  Facebook  and  Instagram  might  require  a  [9]   B. Abarbanel, S. M. Gainsbury, D. King, N. Hing, and P. H. Delfabbro,
reevaluation of the feature extraction techniques to maintain  “Gambling games on social platforms: How do advertisements for social
model accuracy.  casino games target young adults?,” Policy & internet, vol. 9, no. 2, pp.
184–209, 2017.
For future research, it is recommended to apply and test this  [10]  R. Cassidy and N. Ovenden, “Frequency, duration and medium of
model  on  other  social  media  platforms  to  broaden  the  advertisements for gambling and other risky products in commercial and
public service broadcasts of English Premier League football.,” 2017.
generalization of the results, develop more efficient approaches
for  data  annotation  to  enhance  labeling  accuracy  and  [11]  S.  M.  Gainsbury,  P.  Delfabbro,  D.  L.  King,  and  N.  Hing,  “An
exploratory study of gambling operators’ use of social media and the
consistency,  integrate  sentiment  analysis  to  gain  a  deeper  latent messages conveyed,” J. Gambl. Stud., vol. 32, no. 1, pp. 125–141,
| understanding of the psychological impact of online gambling  |     |     |     |     |     |     |     | 2016.  |     |     |     |     |     |     |     |
| ------------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | ------ | --- | --- | --- | --- | --- | --- | --- |
promotion content on social media users, and explore the use  [12]  C. Erlingsson and P. Brysiewicz, “A hands-on guide to doing content
of  other  deep  learning  algorithms  that  may  offer  better  analysis,” African J. Emerg. Med., vol. 7, no. 3, pp. 93–99, 2017.
performance with larger datasets.  [13]  R. J. E. James and A. Bradley, “The use of social media in research on
gambling: A systematic review,” Curr. Addict. Reports, vol. 8, pp. 235–
| With these suggestions, it is hoped that future research can  |     |     |     |     |     |     |     | 245, 2021.  |     |     |     |     |     |     |     |
| ------------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- |
be  more  comprehensive  in  addressing  and  preventing  the  [14]  S. Choi, “Understanding Involuntary Illegal Online Gamblers in the
spread of illegal content on social media.  U.S.: Framing in Misleading Information by Online Casino Reviews,”
UNLV Gaming Res. Rev. J., vol. 27, no. 1, pp. 23–47, 2023, [Online].
|     |     |     |     |     |     |     |     | Available:  | https://www.proquest.com/scholarly-journals/understanding- |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------- | ---------------------------------------------------------- | --- | --- | --- | --- | --- | --- |
involuntary-illegal-online-gamblers/docview/2807105791/se-
2?accountid=17242
|     |     |     |     |     |     |     |     |     |     |     |     |     |     | 948 | P | a ge   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- | ------ |
www.ijacsa.thesai.org

(IJACSA) International Journal of Advanced Computer Science and Applications,
Vol. 15, No. 8, 2024
[15] A. HernáNdez-Ruiz and Y. Gutiérrez, “Analysing the Twitter accounts [26] P. Chiawchansilp and P. Kantavat, “Spam Article Detection on Social
of licensed Sports gambling operators in Spain: a space for responsible Media Platform Using Deep Learning: Enhancing Content Integrity and
gambling?,” Commun. Soc., vol. 34, no. 4, pp. 65–79, 2021, doi: User Experience,” 2023. doi: 10.1145/3628454.3628459.
https://doi.org/10.15581/003.34.4.65-79. [27] S. Kaddoura, S. A. Alex, M. Itani, S. Henno, A. AlNashash, and D. J.
[16] K. Kolandai-Matchett and M. Wenden Abbott, “Gaming-Gambling Hemanth, “Arabic spam tweets classification using deep learning,”
Convergence: Trends, Emerging Risks, and Legislative Responses,” Int. Neural Comput. Appl., vol. 35, no. 23, pp. 17233–17246, Apr. 2023,
J. Ment. Health Addict., vol. 20, no. 4, pp. 2024–2056, Aug. 2022, doi: doi: 10.1007/s00521-023-08614-w.
https://doi.org/10.1007/s11469-021-00498-y. [28] M. Liu, Y. Zhang, B. Liu, Z. Li, H. Duan, and D. Sun, “Detecting and
[17] A. Bradley and R. J. James, “How are major gambling brands using Characterizing SMS Spearphishing Attacks,” in Proceedings of the 37th
Twitter?,” Int. Gambl. Stud., vol. 19, no. 3, pp. 451–470, 2019. Annual Computer Security Applications Conference, 2021, pp. 930–943.
[18] T. Teichert, A. Graf, T. B. Swanton, and S. M. Gainsbury, “The joint doi: 10.1145/3485832.3488012.
influence of regulatory and social cues on consumer choice of gambling [29] N. Nasir, F. Iqbal, M. Zaheer, M. Shahjahan, and M. Javed, “Lures for
websites: preliminary evidence from a discrete choice experiment,” Int. Money: A First Look into YouTube Videos Promoting Money-Making
Gambl. Stud., vol. 21, no. 3, pp. 480–497, Sep. 2021, doi: Apps,” in Proceedings of the 2022 ACM on Asia Conference on
10.1080/14459795.2021.1921011. Computer and Communications Security, 2022, pp. 1195–1206. doi:
[19] S. Aiyar and N. P. Shetty, “N-gram assisted youtube spam comment 10.1145/3488932.3517404.
detection,” Procedia Comput. Sci., vol. 132, p. 1740182, 2018. [30] C. O. Bilah, T. B. Adji, and N. A. Setiawan, “Intent Detection on
[20] Y. Zhang et al., “Lies in the Air: Characterizing Fake-base-station Spam Indonesian Text Using Convolutional Neural Network,” 2022.
Ecosystem in China,” in Proceedings of the 2020 ACM SIGSAC [31] M. Aryani, E. Miranda, Y. Fernando, and T. M. Kibtiah, “An Early
Conference on Computer and Communications Security, 2020, pp. 521– Warning Detection System of Terrorism in Indonesia from Twitter
534. doi: 10.1145/3372297.3417257. Contents using Naïve Bayes Algorithm,” 2020.
[21] E. Zhu, J. Wu, H. Liu, and K. Li, “A Sentiment Index of the Housing [32] E. B. Setiawan, D. H. Widyantoro, and K. Surendro, “Detecting
Market in China: Text Mining of Narratives on Social Media,” J. Real Indonesian Spammer on Twitter,” in 2018 6th International Conference
Estate Financ. Econ., vol. 66, no. 1, pp. 77–118, Jan. 2023, doi: on Information and Communication Technology (ICoICT), 2018, pp.
https://doi.org/10.1007/s11146-022-09900-5. 259–263. doi: 10.1109/ICoICT.2018.8528773.
[22] S. I. Alqahtani, W. M. S. Yafooz, A. Alsaeedi, L. Syed, and R. [33] A. Pinandito, R. S. Perdana, M. C. Saputra, and H. M. Az-zahra, “Spam
Alluhaibi, “Children’s Safety on YouTube: A Systematic Review,” detection framework for Android Twitter application using Na\"{\i}ve
Appl. Sci., vol. 13, no. 6, p. 4044, Mar. 2023, doi: Bayes and K-Nearest Neighbor classifiers,” in Proceedings of the 6th
10.3390/app13064044. International Conference on Software and Computer Applications, 2017,
[23] R. Rossi, A. Nairn, J. Smith, and C. Inskip, “Get a£ 10 Free Bet Every pp. 77–82. doi: 10.1145/3056662.3056704.
Week!”—gambling advertising on Twitter: volume, content, followers, [34] L. Alhaura and I. Budi, “Malicious Account Detection on Indonesian
engagement, and regulatory compliance,” J. public policy Mark., vol. Twitter Account,” in 2020 3rd International Conference on Computer
40, no. 4, pp. 487–504, 2021. and Informatics Engineering (IC2IE), 2020, pp. 176–181. doi:
[24] J. Singer, V. Kufenko, A. Wöhr, M. Wuketich, and S. Otterbach, “How 10.1109/IC2IE50715.2020.9274682.
do Gambling Providers Use the Social Network Twitter in Germany? An [35] I. Fahmi, “Darurat Judi Online di Facebook Pages Indonesia (2) Periode
Explorative Mixed-Methods Topic Modeling Approach,” J. Gambl. Data: 1 Mei – 22 Agustus 2023,” 2023.
Stud., vol. 39, no. 3, pp. 1371–1398, 2023. https://threadreaderapp.com/thread/1704067338306543736.html
[25] S. Tang, X. Mi, Y. Li, X. Wang, and K. Chen, “Clues in Tweets: [36] D. Altman, “Inter-rater agreement,” Pract. Stat. Med. Res., pp. 403–409,
Twitter-Guided Discovery and Analysis of SMS Spam,” in Proceedings 1991.
of the 2022 ACM SIGSAC Conference on Computer and [37] R. I. Alhaqq, “Klasifikasi Ulasan Pengguna Aplikasi InfoBMKG di
Communications Security, 2022, pp. 2751–2764. doi: Google Play Store,” University of Indonesia, 2023.
10.1145/3548606.3559351.
949 | P a ge
www.ijacsa.thesai.org