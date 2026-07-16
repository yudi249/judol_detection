Journal of Applied Informatics and Computing (JAIC)
Vol.9, No.6, December 2025, pp. 3632~3641
e-ISSN: 2548-6861 3632
Deep Learning-Based Detection of Online Gambling Promotion Spam in Indonesian
YouTube Comments
Muhammad Zhafran Ammar 1*, Ricky Eka Putra2*, Yuni Yamasari3*
* Informatika, Universitas Negeri Surabaya
mzhafranammar@gmail.com 1, rickyeka@unesa.ac.id 2, yuniyamasari@unesa.ac.id 3
Article Info ABSTRACT
Article history: Online gambling promotion has increasingly penetrated social media platforms, with
YouTube comments becoming a frequent target for spam-based advertising. Such
Received 2025-09-17
activities not only violate platform policies but also expose users to harmful content.
Revised 2025-11-10
Addressing this issue requires automated detection systems capable of handling
Accepted 2025-11-15
noisy, informal, and highly imbalanced text data. This study investigates the
effectiveness of four recurrent neural architectures LSTM, GRU, BiLSTM, and
Keyword:
BiGRU for detecting gambling promotion comments in Indonesian YouTube data.
Online Gambling, To address class imbalance, multiple experimental scenarios were explored,
LSTM, including the original distribution, undersampling, oversampling, and class
GRU, weighting. Model performance was evaluated using accuracy, precision, recall, F1-
Youtube, score, ROC-AUC, and confusion matrix analysis. The results show that bidirectional
Deep Learning. models outperformed their unidirectional counterparts, with BiGRU achieving the
best overall performance. When combined with class weighting, BiGRU reached
98% accuracy, 0.83 F1-score, and 0.971 ROC-AUC, demonstrating a superior ability
to detect minority-class instances. Oversampling improved recall substantially but
increased false positives, while undersampling reduced accuracy; class weighting
provided the most balanced performance across metrics. These findings confirm that
BiGRU with class weighting offers the most practical balance between accuracy,
recall, and computational efficiency, making it well-suited for real-time moderation
systems. The study provides a strong foundation for future research on transformer-
based architectures and cross-platform spam detection in Indonesian social media
environments.
This is an open access article under the CC–BY-SA license.
interact directly with creators, making it a vital feature of the
I. INTRODUCTION platform [2]⁠⁠.
YouTube, the world’s largest video-sharing platform, has The rapid growth of digital technologies has also enabled
transformed the way people consume and engage with online the expansion of online gambling activities. Online gambling
content. As of April 2025, more than 20 million videos are provides individuals with easy access to games and betting
uploaded daily, with the platform already hosting over 20 platforms, often employing aggressive marketing strategies to
billion videos in total ⁠⁠[1]⁠. With its massive user base, attract new users. Psychological factors play a critical role in
YouTube has evolved into a dynamic ecosystem of content encouraging participation, as beginners may experience early
creators and interactive communities, serving not only as a wins, forming a misperception of high winning probability
hub for entertainment but also as a medium for information [3]⁠⁠. Such promotions, including influencer-driven campaigns
exchange and social interaction. In Indonesia, YouTube is promising instant profit, reinforce the appeal of online
among the most widely accessed platforms, shaping cultural gambling and contribute to its normalization in society [4]⁠. A
trends and providing a significant channel for communication common tactic employed in online promotion is spamming
and marketing. The accessibility of its comment section the comments sections of popular YouTube videos, where
allows users to express opinions, engage in discussions, and promotional messages or links to gambling websites are
http://jurnal.polibatam.ac.id/index.php/JAIC

JAIC e-ISSN: 2548-6861 3633
disseminated with minimal marketing cost [5][6]⁠⁠. Despite developing scalable or deployable systems capable of
YouTube’s spam filtering system, these comments often handling large volumes of real-world YouTube data. These
evade detection due to obfuscation tactics such as Unicode limitations highlight the need for more robust, context-aware
characters, Cyrillic alphabets, or special symbols, particularly approaches capable of learning complex linguistic patterns in
in comments written in Indonesian [7]⁠. Recent reports further Indonesian-language spam detection.
highlight the magnitude of this issue: Google Indonesia Recurrent neural networks (RNNs) and their variants, such
disclosed that it blocks around 100,000 online gambling sites as Long Short-Term Memory (LSTM) and Gated Recurrent
every week and removed more than 1.5 million gambling- Unit (GRU), are especially effective for text classification
related ads throughout 2024. Between October 2024 and tasks, as they can capture long-term dependencies in
February 2025 alone, nearly one million pieces of gambling- sequences and better represent contextual meaning in noisy,
related content were taken down[8]⁠⁠. Although these numbers user-generated comments. While LSTM excels at modeling
do not specifically refer to YouTube comments, they longer dependencies, GRU offers a more computationally
demonstrate the massive scale of online gambling promotion efficient alternative with comparable accuracy. In addition,
across Google’s ecosystem, reinforcing the vulnerability of Bidirectional variants of these architectures (BiLSTM and
YouTube’s comment section as a target for such illicit BiGRU) further enhance performance by processing input
activities. sequences in both forward and backward directions, thereby
Previous studies have addressed spam detection in capturing past and future context simultaneously. This
YouTube comments using machine learning and Artificial bidirectional processing is particularly advantageous for
Intelligence (AI). Naive Bayes is popular for its simplicity and detecting gambling-related spam, as promotional cues may
effectiveness, achieving accuracies above 80% [7][9]⁠⁠. More appear in different parts of a comment and require full
advanced methods, such as ensemble techniques, Adaptive contextual understanding.
Genetic Algorithm (AGA), and XGBoost, improve To address these research gaps, this study constructs a
performance on complex datasets [10][11]⁠⁠, while cascaded dataset of Indonesian-language YouTube comments collected
ensemble models combine multiple classifiers to enhance via the YouTube API and manually labeled for gambling-
accuracy [5]⁠⁠. related spam detection. It further evaluates and compares the
Specifically for online gambling promotions in Indonesian performance of four recurrent neural architectures LSTM,
YouTube comments, Samuel and Kristiadi [6]⁠⁠ used Natural GRU, BiLSTM, and BiGRU to identify the most effective
Language Processing (NLP) and Transformer-based models deep learning model for handling informal language and
(IndoBERT) to detect spam, achieving 97% accuracy with imbalanced spam data. Building on these strengths, this study
balanced precision and recall. Similarly, Riza, et. al. [12]⁠⁠ develops a deep learning–based system for detecting online
applied Naive Bayes with TF-IDF and preprocessing steps, gambling promotion spam in Indonesian YouTube comments.
obtaining 97.1% accuracy. Both studies demonstrate that AI The findings are expected to contribute not only to academic
and machine learning can effectively detect and moderate understanding of spam detection in low-resource languages
gambling-related spam on YouTube. A recent study by but also to the development of more effective, automated
Manullang et. al. [13]⁠ compared Support Vector Machine moderation tools for safer online communities.
(SVM), Random Forest, Convolutional Neural Network
(CNN), IndoBERT, and a lightweight transformer model
named Wordformer for Indonesian gambling spam. II. METHOD
Wordformer achieved 0.9975 accuracy and macro F1-score, This chapter describes the methodology applied in the
outperforming traditional models while being more study Deep Learning-Based Detection of Online Gambling
computationally efficient than IndoBERT. These studies Promotion Spam in Indonesian YouTube Comments. The
collectively show that both AI and lightweight deep learning research aims to evaluate the effectiveness of four deep
models can effectively detect and moderate gambling-related learning models: LSTM, GRU, BiLSTM, and BiGRU for
spam in low-resource language settings such as Indonesian- spam classification tasks. To ensure a reliable and
language. reproducible evaluation, a standardized dataset of YouTube
Despite these advancements, gaps remain in the automatic comments in Indonesian-language was employed, combined
dDespite these advancements, studies focusing specifically on with a consistent preprocessing pipeline and a unified
Indonesian-language gambling spam remain limited experimental protocol.
compared to English-language datasets, where linguistic The methodology begins with the description of dataset
resources, labeled corpora, and benchmark datasets are more collection and text preprocessing steps, followed by the
established. Furthermore, conventional machine learning detailed architecture and configurations of the LSTM, GRU,
methods such as Naive Bayes and SVM often struggle to and their bidirectional variants. Bidirectional models were
capture semantic context in informal or slang-heavy included to capture contextual information from both past and
Indonesian text, and perform poorly under highly imbalanced future tokens, which is crucial for detecting disguised
datasets where non-spam comments dominate. Prior works gambling promotions that may appear in different positions
also tend to focus on experimental accuracy rather than within a comment. The chapter concludes with the
Deep Learning-Based Detection of Online Gambling Promotion Spam in Indonesian YouTube Comments
(Muhammad Zhafran Ammar, Ricky Eka Putra, Yuni Yamasari)

| 3634        |     |     |     |     |     |     |     |     |        e-ISSN: 2548-6861   |     |     |     |     |
| ----------- | --- | --- | --- | --- | --- | --- | --- | --- | -------------------------- | --- | --- | --- | --- |
explanation of training strategies, evaluation metrics, and the  URLs, and inconsistent formatting that can hinder model
| computing environment used to validate model performance.   |     |     |     |     |     |     | performance.  |     |     |     |     |     |     |
| ----------------------------------------------------------- | --- | --- | --- | --- | --- | --- | ------------- | --- | --- | --- | --- | --- | --- |
The preprocessing pipeline included the following steps:
A. Data Collection
|       |        |          |                     |     |           |     | 1)    Lowercasing: All text was converted to lowercase to  |     |     |     |     |     |     |
| ----- | ------ | -------- | ------------------- | --- | --------- | --- | ---------------------------------------------------------- | --- | --- | --- | --- | --- | --- |
| This  | study  | focuses  | on  user-generated  |     | comments  |     | from                                                       |     |     |     |     |     |     |
reduce vocabulary size and normalize casing. This helps the
Indonesian YouTube videos as the primary dataset. YouTube
model treat words like “JUDI” and “judi” as the same token.
was chosen for three main reasons. First, it is one of the most
widely accessed platforms in Indonesia, where the comment  2)    URL Removal: URLs and hyperlinks were removed
section serves as a highly interactive space for users to  using regular expressions to eliminate non-semantic noise that
communicate,  share  opinions,  and  engage  with  content  does not contribute to detecting spam content, for example
creators. Second, the open nature of the comment system
“daftar di https://slotmaxwin.com sekarang” to “daftar di
| makes it vulnerable to misuse by spammers, particularly for  |     |     |     |     |     |     | sekarang”.  |     |     |     |     |     |     |
| ------------------------------------------------------------ | --- | --- | --- | --- | --- | --- | ----------- | --- | --- | --- | --- | --- | --- |
promoting online gambling websites at minimal cost. Finally,
YouTube comments in Indonesian often include informal  3)    Mentions  and  Hashtags  Removal:  Mentions
(@username) and hashtags (#promo) were stripped, as they
| language,   | slang,  | mixed    | code-switching,  |     | and       | obfuscation  |            |          |                    |     |              |      |       |
| ----------- | ------- | -------- | ---------------- | --- | --------- | ------------ | ---------- | -------- | ------------------ | --- | ------------ | ---- | ----- |
|             |         |          |                  |     |           |              | generally  | do  not  | carry  meaningful  |     | information  | for  | spam  |
| strategies  | (e.g.,  | Unicode  | characters,      |     | Cyrillic  | letters,     | or         |          |                    |     |              |      |       |
detection, as elements like “@admin ayo join #bonusdepo”
emojis), making them a challenging yet representative dataset
provide little contextual information and were reduced to
| for  evaluating  |     | spam  | detection  | models  | in  | low-resource  |     |     |     |     |     |     |     |
| ---------------- | --- | ----- | ---------- | ------- | --- | ------------- | --- | --- | --- | --- | --- | --- | --- |
“admin ayo join bonusdepo”
languages.
The dataset was collected using the YouTube Data API v3,
|            |       |            |           |     |              |          | 4)    Emoji  |     | and  Symbol  | Cleaning:  | Non-alphanumeric  |     |     |
| ---------- | ----- | ---------- | --------- | --- | ------------ | -------- | ------------ | --- | ------------ | ---------- | ----------------- | --- | --- |
| capturing  | both  | top-level  | comments  |     | and  nested  | replies  | to           |     |              |            |                   |     |     |
symbols, including emojis and decorative punctuation, were
preserve  conversational  context.  Each  record  contained  replaced with spaces. This reduces noise while retaining the
metadata such as comment ID, parent comment ID, author
textual content, so that “Cuan mantap    !!!” became
display name, timestamp, and textual content. The initial
“cuan mantap”.
| corpus  | consisted  | of  | 26,208  | comments  | across  | multiple  |     |     |     |     |     |     |     |
| ------- | ---------- | --- | ------- | --------- | ------- | --------- | --- | --- | --- | --- | --- | --- | --- |
Indonesian  channels,  reflecting  a  natural  mixture  of  5)    Whitespace  Normalization:  Consecutive  spaces
entertainment, lifestyle, and popular culture content where  were collapsed into a single space to maintain consistency for
tokenization.
gambling spam is commonly disseminated.
A two-stage labeling process was applied to ensure data
|               |         |                |     |               |     |                | 6)    Unicode  |     | Normalization:  |     | Text  was  | normalized  | to  |
| ------------- | ------- | -------------- | --- | ------------- | --- | -------------- | -------------- | --- | --------------- | --- | ---------- | ----------- | --- |
| reliability.  | First,  | an  automatic  |     | pre-labeling  |     | step  flagged  |                |     |                 |     |            |             |     |
NFKD form to standardize accented characters and other
potential gambling spam based on keyword-based heuristics,
Unicode variants, which is important for handling special
including brand names (e.g., “pulauwin”, “slot”, “maxwin”),
characters or combined symbols, such as transforming “𝓳𝓾𝓭𝓲
promotional phrases (e.g., “judi online”, “daftar sekarang”,
ｏｎｌｉｎｅ” into “judi online”.
“bonus deposit”), and domain/contact patterns (e.g., URLs,
Telegram/WhatsApp handles). Next, manual annotation was  7)    Duplicate and Empty Removal: Duplicate comments
performed by two independent annotators who verified each  and  empty  entries  were  removed  to  prevent  bias  and
pre-labeled comment and cross-checked ambiguous cases.  redundancy in the dataset.
Disagreements were resolved through discussion to maintain
TABLE I
high labeling consistency.
COMMENT BEFORE AND AFTER PREPROCESSING
The final dataset was binary-labeled, with 1,400 spam
| comments  | (5.34%)  | and  | 24,808  |     | non-spam  | comments  |                              |     | Comment  |     |                             |     |     |
| --------- | -------- | ---- | ------- | --- | --------- | --------- | ---------------------------- | --- | -------- | --- | --------------------------- | --- | --- |
|           |          |      |         |     |           |           | 01:01 Sungguh takjub dengan  |     |          |     | 0101 sungguh takjub dengan  |     |     |
(94.66%). This significant imbalance reflects the real-world
|               |     |       |             |     |        |                | ❤𝐌𝐎𝐍𝐀 𝟒𝐃🔴! Ceritanya         |     |     |                            | mona 4d ceritanya begitu  |     |     |
| ------------- | --- | ----- | ----------- | --- | ------ | -------------- | ---------------------------- | --- | --- | -------------------------- | ------------------------- | --- | --- |
| distribution  | of  | spam  | in  social  |     | media  | environments,  |                              |     |     |                            |                           |     |     |
|               |     |       |             |     |        |                | begitu menyentuh, memadukan  |     |     | menyentuh memadukan makna  |                           |     |     |
underscoring the need for robust classification techniques. To
mendalam dengan gameplay
makna mendalam dengan
address the imbalance during model training, resampling  yang seru visualnya memukau
gameplay yang seru. Visualnya
strategies such as SMOTE oversampling and undersampling  dan hadiahnya benarbenar luar
memukau, dan hadiahnya?
were  applied  to  the  training  subset,  producing  balanced  biasa wajib coba untuk
Benar-benar luar biasa. Wajib
pengalaman tak terlupakan
datasets for comparative evaluation.  coba untuk pengalaman tak
terlupakan! 🌟
B. Data Preprocessing
asli deh weton88 sama konten
Asli deh, ⭐𝐖𝐄𝐓𝐎𝐍𝟖𝟖⭐
After collection and labeling, all comments underwent a  lo samasama bikin betah
sama konten lo sama-sama
| standardized preprocessing pipeline to ensure that the text  |     |     |     |     |     |     | bikin betah! 🏠  |     |     |     |     |     |     |
| ------------------------------------------------------------ | --- | --- | --- | --- | --- | --- | --------------- | --- | --- | --- | --- | --- | --- |
was clean, consistent, and suitable for input into both deep  0600 pulau777 menangkan
06:00 🅿️🆄🅻🅰️🆄777,
learning and traditional machine learning models. This step is  hadiah menarik setiap hari
menangkan hadiah menarik
crucial in social media text analysis because user-generated
setiap hari
comments often contain informal language, slang, emojis,
JAIC Vol. 9, No. 6, December 2025:  3632 – 3641

JAIC e-ISSN: 2548-6861 3635
Dulu Request ngundang dulu request ngundang GRU relies on two main mechanisms: the update gate,
miawaug di kolom komen miawaug di kolom komen which controls how much of the past information is retained,
video bang Radit sama Tara. video bang radit sama tara and the reset gate, which determines how much past
Akhirnya kejadian akhirnya kejadian information is forgotten when updating the hidden state. This
efficient design makes GRU especially suitable for large-
This sequential preprocessing ensured that the dataset scale text classification tasks and effective in handling short,
reflected authentic Indonesian social media language while noisy, and informal YouTube comments where spam signals
minimizing noise, making it suitable for input into may be sparsely distributed across the text.
classification models. After these steps, the comments were
3) Bidirectional LSTM (BiLSTM)
transformed into numerical representations according to the
The Bidirectional LSTM (BiLSTM) extends the standard
modeling approach. For the deep learning models (BiLSTM
LSTM by processing input sequences in both forward and
and BiGRU), the text was tokenized using the Keras
backward directions. This allows each token’s representation
Tokenizer with a fixed vocabulary size of 10,000, and each
to be informed by both its preceding and succeeding context.
sequence was padded to a maximum length of 128 tokens to
standardize input dimensions. For traditional machine
learning baselines, TF-IDF vectorization was applied to
capture both word occurrence and relative importance within
the corpus.
C. Model Architectures
In this study, four deep learning architectures were
investigated to detect online gambling spam in Indonesian
YouTube comments: LSTM, GRU, BiLSTM and BiGRU.
These models were chosen because they are widely adopted
in text classification tasks and well-suited for handling noisy,
sequential data such as YouTube comments. Tokenization,
padding, and embedding operations were implemented using
Figure 1. Bi-LSTM layer mechanics[14]⁠
the Keras deep learning library.
This bidirectional processing is particularly valuable for
1) Long Short-Term Memory (LSTM) spam detection in YouTube comments, as promotional cues
LSTM networks are a type of RNN designed to overcome may appear at the beginning, middle, or end of a sentence, or
the vanishing gradient problem and capture long-term may even be deliberately obfuscated. By considering both
dependencies in sequential data. LSTM networks maintain an directions, BiLSTM can better identify disguised gambling-
internal cell state that allows them to selectively remember or related expressions.
forget information across long sequences. This makes them
4) Bidirectional Gru (BiGRU)
highly suitable for processing user-generated comments,
Similar to BiLSTM, the Bidirectional GRU (BiGRU)
where spam-related cues may appear at different positions in
enhances the standard GRU by processing sequences in both
a sentence.
directions. This allows the model to capture contextual cues
LSTM operates through three primary mechanisms: the
from both past and future tokens simultaneously, while still
forget gate, which determines which information from the
maintaining computational efficiency.
previous state should be discarded; the input gate, which
decides what new information should be stored; and the
output gate, which regulates what part of the cell state
contributes to the current hidden state. By coordinating these
gates, LSTM effectively preserves relevant information while
filtering out noise, enabling robust detection of spam phrases
that are interspersed with unrelated or informal words in
YouTube comments.
2) Gated Recurrent Units (GRU)
Gated Recurrent Units (GRU) are a simplified variant of
LSTM that achieve comparable performance with fewer
parameters, resulting in faster training. GRUs combine the
memory cell and hidden state into a single hidden state,
making them more computationally efficient while still Figure 2. Bi-Gru layer mechanics[15]⁠⁠
capturing long-term dependencies.
Deep Learning-Based Detection of Online Gambling Promotion Spam in Indonesian YouTube Comments
(Muhammad Zhafran Ammar, Ricky Eka Putra, Yuni Yamasari)

| 3636        |     |     |     |     |     |        e-ISSN: 2548-6861   |     |     |     |
| ----------- | --- | --- | --- | --- | --- | -------------------------- | --- | --- | --- |
BiGRU is especially effective in noisy, user-generated  sequential  processing  into  a  more  discriminative
comments, where spam indicators may be scattered across the  representation for classification [21]⁠. Finally, a single output
text. By integrating context from both directions, BiGRU  neuron with sigmoid activation produces a probability score
improves the model’s ability to detect subtle or shuffled spam  for binary classification, distinguishing spam from non-spam
patterns in Indonesian YouTube comments.  comments.  The  sigmoid  activation  is  commonly  used  in
binary classification problems because it maps the learned
5)    Shared Architecture
features into a probability range between 0 and 1, facilitating
| All  four  | architectures  | (LSTM,  | GRU,  BiLSTM,  and  |                  |     |                   |      |          |        |
| ---------- | -------------- | ------- | ------------------- | ---------------- | --- | ----------------- | ---- | -------- | ------ |
|            |                |         |                     | threshold-based  |     | decision-making.  | The  | overall  | model  |
BiGRU)  share  a  common  design  framework,  ensuring  architecture is illustrated in Figure 3, showing the flow from
consistent  input  representation  and  comparability  across  input  preprocessing  through  embeddings,  recurrent
models. The first component is the embedding layer, where
|            |              |                    |                | processing,  | dropout,  | dense  | transformation,  | and  | final  |
| ---------- | ------------ | ------------------ | -------------- | ------------ | --------- | ------ | ---------------- | ---- | ------ |
| tokenized  | words  from  | the  preprocessed  | comments  are  |              |           |        |                  |      |        |
classification.
mapped into dense vector representations of size 100. Word
embeddings are widely used in text classification because  D. Training Data and Experimental Scenarios
| they  enable  | models  | to  capture  | semantic  and  syntactic  |                    |     |          |                   |           |      |
| ------------- | ------- | ------------ | ------------------------- | ------------------ | --- | -------- | ----------------- | --------- | ---- |
|               |         |              |                           | The  preprocessed  |     | dataset  | was  split  into  | training  | and  |
relationships between words in a continuous space, which is  validation sets using an 80–20 stratified split to maintain the
especially useful for handling informal expressions, slang,  proportion of spam and non-spam comments across both sets.
| and  obfuscated  | spellings  | commonly  | found  in  YouTube  |     |     |     |     |     |     |
| ---------------- | ---------- | --------- | ------------------- | --- | --- | --- | --- | --- | --- |
Stratification ensured that both subsets preserved the original
comments [16][17]⁠. These embeddings are learned during  distribution  of  labels,  which  was  highly  imbalanced.  As
training,  allowing  the  architecture  to  adapt  to  the  shown in Table 1, the training set consisted of 19,846 non-
characteristics of Indonesian social media text.  spam  comments  (94.66%)  and  1,120  spam  comments
(5.34%), while the validation set contained 4,962 non-spam
comments (94.66%) and 280 spam comments (5.34%).
TABLE II
LABEL DISTRIBUTION IN TRAINING AND VALIDATION SETS
|     |     |     |     | Dataset  |     | Label  | Count   | Percentage  |     |
| --- | --- | --- | --- | -------- | --- | ------ | ------- | ----------- | --- |
|     |     |     |     | Train    |     | 0      | 19,846  | 94.66%      |     |
|     |     |     |     |          |     | 1      | 1,120   | 5.34%       |     |
|     |     |     |     | Test     |     | 0      | 4,962   | 94.66%      |     |
|     |     |     |     |          |     | 1      | 280     | 5.34%       |     |

Because of this imbalance, three experimental scenarios
were applied. In the undersampling scenario, the majority
class was reduced to match the minority class, producing a
perfectly balanced dataset with 1,120 samples each (Table 2).
|     |     |     |     | In  the  | oversampling  | scenario,  | the  minority  | class  | was  |
| --- | --- | --- | --- | -------- | ------------- | ---------- | -------------- | ------ | ---- |
synthetically increased using SMOTE, resulting in 19,846
samples for each class. The original scenario used the natural
distribution without modification.
Figure 3. Baseline Model GRU & LSTM
TABLE III
Following the embedding layer, the recurrent layer (either  LABEL DISTRIBUTION AFTER BALANCING (TRAINING SET)
LSTM, GRU, BiLSTM, or BiGRU) processes the sequences  Scenario  Label  Count  Percentage
to  produce  context-aware  representations  for  each  token.  Smote  0  19,846  50%
Recurrent architectures are effective in capturing sequential
|     |     |     |     |     |     | 1   | 19,846  | 50%  |     |
| --- | --- | --- | --- | --- | --- | --- | ------- | ---- | --- |
dependencies and contextual cues, which are critical for spam  Undersample  0  1,120  50%
detection tasks where keyword order and context may vary  1  1,120  50%
| [18][19]⁠. To mitigate overfitting, a dropout layer with a rate  |     |     |     |     |     |     |     |     |     |
| ---------------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
of 0.5 is applied after the recurrent layer, as dropout has been  To complement these balancing strategies, class weights
proven to be an effective regularization technique in neural  were also computed on the original dataset and incorporated
networks  by  preventing  co-adaptation  of  neurons  and  into the loss function so that misclassification of minority-
improving generalization [20]⁠.  class samples received a higher penalty. This ensured that the
The output is then passed through a dense hidden layer with  models remained sensitive to spam detection even when
32  units  and  ReLU  activation,  enabling  non-linear  trained on imbalanced data.
transformations of the learned features. Dense layers allow  Figure 4 illustrates the distribution of spam and non-spam
the model to combine high-level features extracted from  comments  under  the  three  scenarios:  the  original  data
JAIC Vol. 9, No. 6, December 2025:  3632 – 3641

| JAIC  |     |     |     | e-ISSN: 2548-6861  |     |     |     |     |     |     |     |     |     | 3637  |
| ----- | --- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- | ----- |

(imbalanced),  SMOTE  oversampling  (balanced  with  was used as the primary evaluation metric, as it provides a
synthetic samples), and undersampling (balanced by reducing  more reliable assessment of model discrimination ability on
majority class). These visualizations highlight the degree of  imbalanced data compared to accuracy.
imbalance and the effect of each balancing approach.
F. Evaluation Model

Model performance was assessed on the validation set
|     |     |     |     |     |     |     | using            | a  combination     |         | of         | quantitative  |          | metrics        | and  |
| --- | --- | --- | --- | --- | --- | --- | ---------------- | ------------------ | ------- | ---------- | ------------- | -------- | -------------- | ---- |
|     |     |     |     |     |     |     | visualizations.  |                    | First,  | predicted  | labels        | were     | generated      | by   |
|     |     |     |     |     |     |     | applying         | a  threshold       |         | of  0.5    | to  the       | model's  | probabilistic  |      |
|     |     |     |     |     |     |     | outputs.         | A  classification  |         | report     | was           | then     | computed       | to   |
summarize the main metrics for both classes (“Non-Judol”
and “Judol”), including precision, recall, and F1-score.
|     |     |     |     |     |     |     | A confusion matrix was generated to provide a detailed  |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- |
breakdown of true positives (TP), true negatives (TN), false

|     |     |     |     |     |     |     | positives  | (FP),  | and  | false  | negatives  | (FN).  | For  | better  |
| --- | --- | --- | --- | --- | --- | --- | ---------- | ------ | ---- | ------ | ---------- | ------ | ---- | ------- |

|     |     |     |     |     |     |     | interpretability,                                   |     | the  matrix  |           | was  visualized  |               | as  a  | heatmap,  |
| --- | --- | --- | --- | --- | --- | --- | --------------------------------------------------- | --- | ------------ | --------- | ---------------- | ------------- | ------ | --------- |
|     |     |     |     |     |     |     | showing both raw counts and percentages per class.  |     |              |           |                  |               |        |           |
|     |     |     |     |     |     |     | To  comprehensively                                 |     |              | evaluate  | model            | performance,  |        | the       |

following metrics were used on the validation set:
Figure 4. Distribution
of labels under three experimental scenarios: (a) Original data, (b) SMOTE  1)    Accuracy: Proportion of correctly predicted samples
oversampling, (c) Undersampling
𝑇𝑃+𝑇𝑁
| E. Model Training  |     |     |     |     |     |     |     | 𝐴𝑐𝑐𝑢𝑟𝑎𝑐𝑦= |     |     |     |     |     |     |
| ------------------ | --- | --- | --- | --- | --- | --- | --- | --------- | --- | --- | --- | --- | --- | --- |
𝑇𝑃+𝐹𝑃+𝑇𝑁+𝐹𝑁
Model training utilized early stopping by monitoring the
|     |     |     |     |     |     |     | 2)    | Precision:  | Ratio  | of  | correctly  | predicted  |     | positive  |
| --- | --- | --- | --- | --- | --- | --- | ----- | ----------- | ------ | --- | ---------- | ---------- | --- | --------- |
validation loss with a patience of 10 epochs, ensuring that
observations to all predicted positives
training stopped once performance no longer improved. The
best model weights were preserved automatically through a  𝑇𝑃
|     |     |     |     |     |     |     |     |     | 𝑃𝑟𝑒𝑐𝑖𝑠𝑖𝑜𝑛= |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | ---------- | --- | --- | --- | --- | --- |
model checkpoint. To mitigate overfitting, dropout layers  𝑇𝑃+𝐹𝑃
were applied within the architecture, and a class-weighted
|         |                |       |      |           |          |        | 3)    | Recall  | (Sensitivity):  |     | Ratio  | of  correctly  |     | predicted  |
| ------- | -------------- | ----- | ---- | --------- | -------- | ------ | ----- | ------- | --------------- | --- | ------ | -------------- | --- | ---------- |
| binary  | cross-entropy  | loss  | was  | used  to  | address  | class  |       |         |                 |     |        |                |     |            |
positives to all actual positives
imbalance, as described earlier.
| The  | experiments  | were  | conducted  | in  | the  | Kaggle  |     |     |         |     | 𝑇𝑃  |     |     |     |
| ---- | ------------ | ----- | ---------- | --- | ---- | ------- | --- | --- | ------- | --- | --- | --- | --- | --- |
|      |              |       |            |     |      |         |     |     | 𝑅𝑒𝑐𝑎𝑙𝑙= |     |     |     |     |     |
environment  using  Python  3.10  and  TensorFlow  2.14,  𝑇𝑃+𝐹𝑁
supported by an NVIDIA Tesla T4 GPU (16 GB VRAM). All
|     |     |     |     |     |     |     | 4)    | F1-Score: Harmonic mean of precision and recall  |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | ----- | ------------------------------------------------ | --- | --- | --- | --- | --- | --- |
hyperparameters were determined through empirical tuning,
where multiple configurations were tested to balance model  𝑃𝑟𝑒𝑐𝑖𝑠𝑖𝑜𝑛×𝑅𝑒𝑐𝑎𝑙𝑙
|     |     |     |     |     |     |     |     | 𝐹1−𝑆𝑐𝑜𝑟𝑒=2× |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ----------- | --- | --- | --- | --- | --- | --- |
complexity and training stability. A vocabulary size of 10,000
𝑃𝑟𝑒𝑐𝑖𝑠𝑖𝑜𝑛+𝑅𝑒𝑐𝑎𝑙𝑙
words was selected to capture diverse Indonesian linguistic  To evaluate the model's ability to discriminate between
variations while preventing excessive sparsity. The maximum  spam  and  non-spam  comments,  the  ROC  curve  and
| sequence  | length    | was  limited  | to          | 128  tokens  | since  | most    |                |     |      |        |                  |     |                |     |
| --------- | --------- | ------------- | ----------- | ------------ | ------ | ------- | -------------- | --- | ---- | ------ | ---------------- | --- | -------------- | --- |
|           |           |               |             |              |        |         | corresponding  |     | AUC  | score  | were  computed.  |     | Probabilistic  |     |
| YouTube   | comments  | are           | relatively  | short,       | and    | longer  |                |     |      |        |                  |     |                |     |
outputs were used to plot the ROC curve, and cubic spline
sequences  rarely  improved  performance.  The  embedding  interpolation was applied to produce a smooth visualization.
| dimension  | was  | fixed  at  100,  | which  | provided  |     | sufficient  |     |     |     |     |     |     |     |     |
| ---------- | ---- | ---------------- | ------ | --------- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- | --- |
Finally, training and validation loss and accuracy curves
| representational  |     | capacity  |     | without  | introducing  |     |     |     |     |     |     |     |     |     |
| ----------------- | --- | --------- | --- | -------- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- | --- |
were plotted across epochs to inspect model convergence and
overparameterization.  generalization. Cubic spline smoothing was applied to both
Each recurrent layer consisted of 64 units, chosen as a  curves to provide clear visual trends, highlighting whether
| trade-off  | between  | contextual  |     | understanding  |     | and  |     |     |     |     |     |     |     |     |
| ---------- | -------- | ----------- | --- | -------------- | --- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
overfitting or underfitting occurred during training.
| computational cost. The dense layer used 32 neurons with  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
| --------------------------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
ReLU activation to learn higher-level representations before
the  final  sigmoid  output,  which  performed  binary  III. RESULTS
classification. Training was carried out with a batch size of 32
The evaluation covered four architectures (LSTM, GRU,
for stable gradient updates, and Adam optimizer was used for  BiLSTM,  BiGRU)  under  three  scenarios  (original,
its adaptive learning capabilities and consistent convergence
undersampling, SMOTE oversampling).
across all models. The models were trained for a maximum of
A. Model Performance Metrics
50 epochs, with a 20% validation split applied using stratified
sampling to preserve class distribution. The ROC–AUC score
Deep Learning-Based Detection of Online Gambling Promotion Spam in Indonesian YouTube Comments
(Muhammad Zhafran Ammar, Ricky Eka Putra, Yuni Yamasari)

| 3638        |     |     |     |     |     |     |     |     |        e-ISSN: 2548-6861   |     |     |     |     |
| ----------- | --- | --- | --- | --- | --- | --- | --- | --- | -------------------------- | --- | --- | --- | --- |
Table IV presents a complete comparison across models
and settings.
TABLE IV
PERFORMANCE COMPARISON OF MODELS UNDER DIFFERENT DATA
BALANCING SCENARIOS
| Model   |               | Scenario   | Acc   | Rec   | Pre   | F1  ROC     |     |     |     |     |     |     |     |
| ------- | ------------- | ---------- | ----- | ----- | ----- | ----------- | --- | --- | --- | --- | --- | --- | --- |
| GRU     |               | Original   | 0.95  | 0.00  | 0.00  | 0.00  0.50  |     |     |     |     |     |     |     |
|         | Undersample   |            | 0.05  | 0.05  | 1.00  | 0.10  0.52  |     |     |     |     |     |     |     |
|         | Oversample    |            | 0.43  | 0.08  | 0.97  | 0.15  0.92  |     |     |     |     |     |     |     |
| LSTM    |               | Original   | 0.95  | 0.00  | 0.00  | 0.00  0.50  |     |     |     |     |     |     |     |
|         | Undersample   |            | 0.05  | 0.05  | 1.00  | 0.10  0.40  |     |     |     |     |     |     |     |
|         | Oversample    |            | 0.05  | 0.05  | 1.00  | 0.10  0.51  |     |     |     |     |     |     |     |
| BiGRU   |               | Original   | 0.98  | 0.82  | 0.85  | 0.83  0.97  |     |     |     |     |     |     |     |
|         | Undersample   |            | 0.89  | 0.32  | 0.89  | 0.47  0.96  |     |     |     |     |     |     |     |
|         | Oversample    |            | 0.67  | 0.13  | 0.92  | 0.23  0.92  |     |     |     |     |     |     |     |
| BiLSTM  |               | Original   | 0.98  | 0.77  | 0.89  | 0.83  0.97  |     |     |     |     |     |     |     |
|         | Undersample   |            | 0.85  | 0.26  | 0.94  | 0.40  0.96  |     |     |     |     |     |     |     |
|         | Oversample    |            | 0.75  | 0.17  | 0.90  | 0.28  0.92  |     |     |     |     |     |     |     |

Figure 5. Bi-LSTM Confusion Matrix
The results indicate that the bidirectional models (BiLSTM
and BiGRU) significantly outperformed their unidirectional
counterparts (LSTM and GRU), especially when trained on
the original imbalanced dataset. Both BiLSTM and BiGRU
achieved accuracy above 98% with high recall and ROC-
AUC, demonstrating robustness in handling skewed class
distributions without requiring resampling techniques.
Between the two, BiGRU slightly outperformed BiLSTM,
particularly in terms of recall (+3%) and ROC-AUC (+0.8%).
This shows that BiGRU is more effective at detecting Judol
comments, as it captures more minority-class instances while
maintaining comparable precision and overall accuracy.
In contrast, the unidirectional LSTM and GRU models
performed poorly under the original imbalance, completely
| failing  | to  detect  | Judol  | comments  | (recall  | =   | 0).  Although  |     |     |     |     |     |     |     |
| -------- | ----------- | ------ | --------- | -------- | --- | -------------- | --- | --- | --- | --- | --- | --- | --- |
oversampling and undersampling improved recall close to
1.0, this came at the expense of drastically reduced precision
| and  accuracy,  |        | making    | them       | unsuitable  |       | for  practical  |     |                                    |     |     |     |     |     |
| --------------- | ------ | --------- | ---------- | ----------- | ----- | --------------- | --- | ---------------------------------- | --- | --- | --- | --- | --- |
| deployment.     |        |           |            |             |       |                 |     | Figure 6. Bi-GRU Confusion Matrix  |     |     |     |     |     |
| Overall,        | these  | findings  | highlight  |             | that  | bidirectional   |     |                                    |     |     |     |     |     |
Bi-LSTM correctly identified 250 Judol comments but
architectures are essential for spam detection tasks on highly
misclassified 30 as Non-Judol, while 74 Non-Judol comments
imbalanced YouTube comment data, with BiGRU being the
|     |     |     |     |     |     |     | were  incorrectly  |     | predicted  | as  Judol.  | Bi-GRU  | performed  |     |
| --- | --- | --- | --- | --- | --- | --- | ------------------ | --- | ---------- | ----------- | ------- | ---------- | --- |
most effective and reliable model across different evaluation
|     |     |     |     |     |     |     | better,  detecting  |     | 238  Judol  | comments  | with  | only  | 42  |
| --- | --- | --- | --- | --- | --- | --- | ------------------- | --- | ----------- | --------- | ----- | ----- | --- |
settings.
misclassified as Non-Judol, although it produced 53 false
B. Confusion Matrix Analysis  positives.  This  indicates  that  BiLSTM  is  slightly  more
aggressive in identifying Judol comments, which improves
| The  | confusion  | matrices  | of  | the  BiLSTM  |     | and  BiGRU  |     |     |     |     |     |     |     |
| ---- | ---------- | --------- | --- | ------------ | --- | ----------- | --- | --- | --- | --- | --- | --- | --- |
recall but increases false positives compared to BiGru.
models on the original dataset are shown in Figures 5 and 6.
|               |     |           |       |                 |     |                 | For  completeness,  |          | confusion  | matrices     | for     | all  | models  |
| ------------- | --- | --------- | ----- | --------------- | --- | --------------- | ------------------- | -------- | ---------- | ------------ | ------- | ---- | ------- |
| Both  models  |     | achieved  | high  | classification  |     | accuracy,  yet  |                     |          |            |              |         |      |         |
|               |     |           |       |                 |     |                 | (LSTM,  GRU,        | BiLSTM,  |            | and  BiGRU)  | across  | the  | three   |
differences can be observed in their handling of the minority
|     |     |     |     |     |     |     | experimental  | scenarios  |     | (original,  | oversampling,  |     | and  |
| --- | --- | --- | --- | --- | --- | --- | ------------- | ---------- | --- | ----------- | -------------- | --- | ---- |
(Judol) class. BiGRU yielded higher recall, whereas BiLSTM
undersampling) are provided in Appendix A (Figures A1–
maintained slightly fewer false positives.
A12).
C. Training and Validation Dynamics
Figures 7 and 8 present the training and validation curves
of BiLSTM and BiGRU on the original dataset. Both models
|     |     |     |     |     |     |     | converged  | rapidly,  | surpassing  | 95%  | validation  | accuracy  |     |
| --- | --- | --- | --- | --- | --- | --- | ---------- | --------- | ----------- | ---- | ----------- | --------- | --- |
JAIC Vol. 9, No. 6, December 2025:  3632 – 3641

JAIC e-ISSN: 2548-6861 3639
within the first three epochs. While BiLSTM showed minor
fluctuations in validation loss after epoch 10, BiGRU
maintained more stable validation performance, peaking at
98.5% accuracy.
Figure 7. Bi-LSTM Training and Validation
Figure 10. Bi-GRU ROC-AUC Curve
Both achieved ROC-AUC above 0.97, confirming
excellent separability between Judol and Non-Judol
comments. The BiGRU curve was consistently closer to the
top-left corner, reflecting its superior discriminative ability.
IV. DISCUSSIONS
Figure 8. Bi-GRU Training and Validation The experimental results demonstrate that both BiLSTM
and BiGRU achieved strong performance in detecting online
The full training and validation curves for all models and
gambling promotion comments in Indonesian YouTube data,
experimental scenarios are available in Appendix B (Figures
with overall accuracy reaching 98 percent. Despite their
B1–B12).
comparable accuracy, a closer examination of the evaluation
D. ROC-AUC Analysis metrics shows that BiGRU consistently achieved higher recall
and ROC-AUC compared to BiLSTM. Specifically, BiGRU
The ROC curves of BiLSTM and BiGRU on the original
improved recall by 3 percent and ROC-AUC by 0.8 percent,
dataset are displayed in Figures 9 and 10.
indicating a stronger capability to identify minority-class
instances. This is an important finding in the context of spam
detection, where the risk of missing harmful promotional
content is more critical than incorrectly flagging benign
comments.
Another dimension of the analysis involves the different
data scenarios applied in this study. Training on the original
imbalanced dataset resulted in strong accuracy but relatively
weaker recall, as the models were biased toward the majority
class. Oversampling with SMOTE improved recall by
exposing the models to a larger variety of minority-class
samples, though at the cost of increased false positives.
Undersampling balanced the classes more directly, producing
higher sensitivity but with reduced overall stability due to
fewer training samples. The use of class weights provided the
most balanced trade-off, ensuring that minority-class
misclassifications were penalized during training. These
results highlight the importance of handling class imbalance
carefully, as it directly impacts a model’s ability to detect
Judol promotion.
The comparison between unidirectional and bidirectional
Figure 9. Bi-LSTM ROC-AUC Curve
models further reinforces this conclusion. While both LSTM
Deep Learning-Based Detection of Online Gambling Promotion Spam in Indonesian YouTube Comments
(Muhammad Zhafran Ammar, Ricky Eka Putra, Yuni Yamasari)

3640 e-ISSN: 2548-6861
and GRU delivered competitive results, their bidirectional study focused exclusively on recurrent neural architectures.
counterparts consistently achieved stronger performance by Transformer-based models such as IndoBERT or multilingual
leveraging contextual information from both past and future BERT have been shown to capture complex linguistic
tokens. The improvements were especially notable for features more effectively and may achieve even stronger
BiGRU, which combined the efficiency of GRU with the results in similar tasks. Future research could expand the
contextual depth of bidirectionality. In contrast, the dataset across multiple platforms, incorporate additional deep
unidirectional versions showed limitations in recall, learning architectures such as attention-augmented GRU or
suggesting that access to bidirectional context is crucial when hybrid ensembles, and evaluate model performance in cross-
spam-related cues can appear at any position within short, domain scenarios.
noisy YouTube comments. Overall, the findings confirm that BiGRU provides a
This performance advantage can be explained by the practical balance between accuracy, recall, and computational
complementary strengths of bidirectional processing and the efficiency. These characteristics make it a strong candidate
gated recurrent mechanism. Bidirectional learning enables the for real-world deployment in automated moderation systems
model to understand the semantic context from both aimed at detecting online gambling promotion spam in
preceding and succeeding words in a comment, which is Indonesian social media environments.
critical for detecting implicit or fragmented expressions often
found in informal YouTube text. Meanwhile, the GRU’s
gating system effectively regulates information flow without V. CONCLUSION
the separate memory cell used in LSTM, making it more This study investigated the detection of online gambling
efficient in retaining relevant features and discarding noise. promotion (Judol) comments in Indonesian YouTube data
The combination of these two mechanisms allows BiGRU to using four recurrent neural architectures: LSTM, GRU,
maintain long-term contextual understanding while remaining BiLSTM, and BiGRU. Multiple data-balancing strategies
computationally lightweight, which is particularly were also explored, including the original imbalanced dataset,
advantageous for short, context-limited sequences such as undersampling, oversampling, and class weighting, to
user comments. evaluate their effect on minority-class detection.
Another notable aspect is the computational efficiency of The results show that the bidirectional variants (BiLSTM
the two models. BiGRU requires fewer parameters and and BiGRU) consistently outperformed their unidirectional
employs a simpler gating mechanism compared to BiLSTM, counterparts, with BiGRU achieving the strongest overall
making it more suitable for real-time applications[22]⁠. In performance. Specifically, BiGRU trained on the original
scenarios such as automated comment moderation on social dataset with class weighting achieved the highest balance
media platforms, computational cost and response time are across metrics, reaching 98.19% accuracy, 0.83 F1-score, and
important considerations. The efficiency advantage of 0.971 ROC-AUC. Compared to BiLSTM, BiGRU improved
BiGRU therefore provides practical benefits beyond recall by approximately 3% and ROC-AUC by nearly 1%,
accuracy, especially in large-scale or resource-constrained demonstrating a stronger ability to capture minority-class
environments. (Judol) instances.
The training dynamics of both models also support this The experiments with different data scenarios also provide
conclusion. BiGRU displayed stable validation accuracy and key insights. Training on the original imbalanced dataset
loss throughout training, whereas BiLSTM exhibited slight yielded high accuracy but low recall, as models favored the
fluctuations after convergence. This stability suggests that majority class. Oversampling improved recall substantially
BiGRU is less sensitive to noise in the data and generalizes (up to 0.92 for Judol) but reduced overall accuracy due to
more effectively. Since YouTube comments are typically increased false positives. Undersampling allowed models to
short, informal, and highly variable, this robustness is detect Judol more aggressively but significantly harmed
valuable for ensuring reliable performance in practice. overall accuracy. Class weighting emerged as the most
The characteristics of the dataset further explain the balanced strategy, allowing both BiLSTM and BiGRU to
observed differences between the two models. Previous generalize effectively without sacrificing accuracy.
studies have shown that GRU-based models are particularly These findings confirm that BiGRU, when combined with
effective for short to medium-length sequences, while LSTM- class weighting, represents the most practical approach for
based models excel in tasks involving long-range detecting Judol promotion in YouTube comments. Its
dependencies. Given that most of the comments in this dataset superior recall, strong discriminative ability, and
are short and context-limited, the structural efficiency of GRU computational efficiency make it suitable for real-time
aligns well with the nature of the input, leading to stronger moderation systems where failing to detect harmful content
results in minority-class detection. carries greater risk than false positives.
Despite these encouraging outcomes, several limitations Although the dataset size and scope were limited, the
must be acknowledged. The dataset was limited to 19 videos findings provide a strong foundation for future work.
across nine channels, which may introduce topic-specific bias Expanding the dataset, incorporating transformer-based
and limit the generalizability of the findings. Furthermore, the
JAIC Vol. 9, No. 6, December 2025: 3632 – 3641

JAIC e-ISSN: 2548-6861 3641
models, and exploring hybrid architectures could further [10] A. O. Abdullah, M. A. Ali, M. Karabatak, and A. Sengur, “A
enhance detection performance. comparative analysis of common YouTube comment spam filtering
techniques,” 6th Int. Symp. Digit. Forensic Secur. ISDFS 2018 -
In conclusion, this study demonstrates that BiGRU with
Proceeding, vol. 2018-Janua, pp. 1–5, 2018, doi:
class weighting provides the optimal balance of accuracy 10.1109/ISDFS.2018.8355315.
(98%), recall (0.85–0.89), and ROC-AUC (>0.97), [11] N. Ghatasheh, I. Altaharwa, and K. Aldebei, “Modified Genetic
establishing it as a promising model for real-world Algorithm for Feature Selection and Hyper Parameter Optimization:
Case of XGBoost in Spam Prediction,” IEEE Access, vol. 10, no. July,
deployment in automated moderation systems aimed at
pp. 84365–84383, 2022, doi: 10.1109/ACCESS.2022.3196905.
combating online gambling promotion spam in Indonesian [12] F. Jauhari, M. Riza, R. G. Guntara, and M. R. Nugraha, “Indonesian
social media environments. Journal of Digital Business Implementasi Algoritma Naive Bayes
untuk Filtrasi Spam Komentar Judi Online pada YouTube,” vol. 5, no.
2, pp. 411–423, 2025.
[13] M. C. T. Manullang, A. Z. Rakhman, H. Tantriawan, and A. Setiawan,
DAFTAR PUSTAKA
“Comparative Analysis of CNN, Transformers, and Traditional ML
[1] YouTube, “YouTube Press Statistics.” [Online]. Available: for Classifying Online Gambling Spam Comments in Indonesian,” J.
https://www.youtube.com/yt/about/press/ Appl. Informatics Comput., vol. 9, no. 3, pp. 592–602, 2025, doi:
[2] A. S. Xiao and Q. Liang, “Spam detection for Youtube video 10.30871/jaic.v9i3.9468.
comments using machine learning approaches,” Mach. Learn. with [14] D. Naik and C. D. Jaidhar, “A novel Multi-Layer Attention
Appl., vol. 16, no. December 2023, p. 100550, 2024, doi: Framework for visual description prediction using bidirectional
10.1016/j.mlwa.2024.100550. LSTM,” J. Big Data, vol. 9, no. 1, 2022, doi: 10.1186/s40537-022-
[3] A. A. Makarin and L. Astuti, “Faktor yang Mempengaruhi Mahasiswa 00664-6.
Melakukan Perjudian Online,” Indones. J. Crim. Law Criminol., vol. [15] E. Mahdi, C. Martin-Barreiro, and X. Cabezas, “A Novel Hybrid
3, no. 3, pp. 180–189, 2023, doi: 10.18196/ijclc.v3i3.17674. Approach Using an Attention-Based Transformer + GRU Model for
[4] Pande Putu Rastika Paramartha, Anak Agung Sagung Laksmi Dewi, Predicting Cryptocurrency Prices,” Mathematics, vol. 13, no. 9, pp. 1–
and I Putu Gede Seputra, “Sanksi Pidana terhadap Para Pemasang dan 19, 2025, doi: 10.3390/math13091484.
Promosi Iklan Bermuatan Konten Judi Online,” J. Prefer. Huk., vol. 2, [16] T. Mikolov, K. Chen, G. Corrado, and J. Dean, “Efficient Estimation
no. 1, pp. 156–160, 2021, doi: 10.22225/jph.2.1.3062.156-160. of Word Representations in Vector Space,” Jan. 2013, [Online].
[5] H. Oh, “A YouTube Spam Comments Detection Scheme Using Available: http://arxiv.org/abs/1301.3781
Cascaded Ensemble Machine Learning Model,” IEEE Access, vol. 9, [17] Y. Kim, “Convolutional neural networks for sentence classification,”
pp. 144121–144128, 2021, doi: 10.1109/ACCESS.2021.3121508. EMNLP 2014 - 2014 Conf. Empir. Methods Nat. Lang. Process. Proc.
[6] Samuel and D. Prasetya Kristiadi, “Deteksi Teks Promosi Judi Online Conf., pp. 1746–1751, 2014, doi: 10.3115/v1/d14-1181.
Menggunakan Ai Dengan Kombinasi NLP Dan Deep Learning,” J. [18] K. Cho et al., “Learning phrase representations using RNN encoder-
Sist. Inf. dan Teknol. , vol. 5, no. 2 SE-Artikel, pp. 179–185, Jul. 2025, decoder for statistical machine translation,” EMNLP 2014 - 2014 Conf.
doi: 10.56995/sintek.v5i2.179. Empir. Methods Nat. Lang. Process. Proc. Conf., pp. 1724–1734,
[7] J. R. Fernando, R. Budiraharjo, and E. Haganusa, “Spam 2014, doi: 10.3115/v1/d14-1179.
Classification on 2019 Indonesian President Election Youtube [19] S. Hochreiter and J. Schmidhuber, “Long Short-Term Memory,”
Comments Using Multinomial Naïve-Bayes,” Indones. J. Artif. Intell. Neural Comput., vol. 9, no. 8, pp. 1735–1780, 1997, doi:
Data Min., vol. 2, no. 1, pp. 37–44, 2019, doi: 10.1162/neco.1997.9.8.1735.
10.24014/ijaidm.v2i1.6445. [20] N. Srivastava, G. Hinton, A. Krizhevsky, I. Sutskever, and R.
[8] Bloomberg Technoz, “Konten Judi Online Menjamur di Komen Salakhutdinov, “Dropout: A simple way to prevent neural networks
YouTube, Google Menjawab,” Feb. 2025. [Online]. Available: from overfitting,” J. Mach. Learn. Res., vol. 15, pp. 1929–1958, 2014.
https://www.bloombergtechnoz.com/detail-news/63330/konten-judi- [21] I. Goodfellow, “Front Matter,” Linear Algebr., pp. i–ii, 2014, doi:
online-menjamur-di-komen-youtube-google-menjawab/2 10.1016/b978-0-12-391420-0.09987-x.
[9] N. M. Samsudin, C. F. B. Mohd Foozy, N. Alias, P. Shamala, N. F. [22] M. J. Hamayel and A. Y. Owda, “A Novel Cryptocurrency Price
Othman, and W. I. S. Wan Din, “Youtube spam detection framework Prediction Model Using GRU, LSTM and bi-LSTM Machine
using naïve bayes and logistic regression,” Indones. J. Electr. Eng. Learning Algorithms,” AI, vol. 2, no. 4, pp. 477–496, 2021, doi:
Comput. Sci., vol. 14, no. 3, pp. 1508–1517, 2019, doi: 10.3390/ai2040030.
10.11591/ijeecs.v14.i3.pp1508-1517.
Deep Learning-Based Detection of Online Gambling Promotion Spam in Indonesian YouTube Comments
(Muhammad Zhafran Ammar, Ricky Eka Putra, Yuni Yamasari)