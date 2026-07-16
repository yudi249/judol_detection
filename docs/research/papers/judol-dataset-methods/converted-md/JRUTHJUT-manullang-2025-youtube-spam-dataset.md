Journal of Applied Informatics and Computing (JAIC)
Vol.9, No.3, June 2025, pp. 592~602
e-ISSN: 2548-6861 592
Comparative Analysis of CNN, Transformers, and Traditional ML for
Classifying Online Gambling Spam Comments in Indonesian
Martin Clinton Tosima Manullang 1*, Arkham Zahri Rakhman 2, Hartanto Tantriawan 3, Andika Setiawan 4
* Teknik Informatika, Fakultas Teknologi Industri, Institut Teknologi Sumatera, Lampung Selatan, Indonesia
martin.manullang@if.itera.ac.id 1*, arkham@if.itera.ac.id 2, hartanto.tantriawan@if.itera.ac.id 3, andika.setiawan@if.itera.ac.id 4
Article Info ABSTRACT
Article history: The rise of user-generated content on social media and live-streaming platforms has
intensified the spread of spam, particularly online gambling (Judi Online)
Received 2025-04-22
promotions, which remain prevalent in Indonesian comment sections. This study
Revised 2025-05-07
investigates the effectiveness of various machine learning (ML) and deep learning
Accepted 2025-06-02
(DL) approaches in classifying such spam content in Bahasa Indonesia. We compare
five models: Support Vector Machine (SVM), Random Forest (RF), a CNN-based
Keyword:
model, IndoBERT, and a custom lightweight transformer model named Wordformer.
Indonesian Language, While IndoBERT achieves the highest performance across all metrics, it comes with
Deep Learning, high computational demands. Wordformer, in contrast, delivers a strong balance
Spam Detection, between accuracy and efficiency, outperforming traditional models while being
Transformer, significantly more lightweight than IndoBERT. Wordformer achieved 0.9975
Wordformer. accuracy and macro F1-score, surpassing SVM (0.9578) and Random Forest
(0.9729), while maintaining a significantly smaller model size and fewer multiply-
add operations. An extensive ablation study further explores the architectural and
training design choices that influence Wordformer’s performance. The findings
suggest that lightweight transformer models can offer practical, scalable solutions
for spam detection in low-resource language settings without the need for large
pretrained backbones.
This is an open access article under the CC–BY-SA license.
especially those capable of understanding the linguistic
I. INTRODUCTION
patterns of Bahasa Indonesia.
In the digital era, the rise of user-generated content on Online gambling promotional comment spam has emerged
platforms like social media and online comment sections has as a concerning digital phenomenon in Indonesia, not only
enabled unprecedented public interaction—but also opened disrupting user experience on the internet but also
the floodgates to misuse, including the spread of spam exacerbating the broader social and economic consequences
promoting Judi Online (online gambling). In Indonesia, this of online gambling practices. Sriyana, et al. [3] highlights that
issue has become more than a nuisance; it is now a serious online gambling has severe psychological effects on
societal and economic threat. Despite strict legal bans, online individuals, including increased anxiety, social isolation, and
gambling remains widely accessible, especially to young family conflicts. The proliferation of spam comments has
people, and has been linked to addiction, mental health become more deeply rooted as public figures increasingly
decline, and even suicidal behavior [1]. Economically, the endorse illegal gambling sites, as noted by Kosasih and
consequences ripple beyond individuals—job loss, debt, asset Setiady [4], who argue that such celebrity involvement
liquidation, and criminal behavior to finance gambling are distorts public perception and blurs the line between
increasingly reported, leading to social instability and reduced legitimate and illicit promotion. Additionally, Nurdiansyah
workforce productivity [2]. This multifaceted harm and Kanda [5] emphasize the economic losses and mental
underscores the urgency of effective spam filtering systems, health issues triggered by online gambling, further intensified
by the accessibility of such content through spam. Rafiqah
http://jurnal.polibatam.ac.id/index.php/JAIC

JAIC e-ISSN: 2548-6861 593
and Rasyid [6] point out that these impacts also contribute to [14], CharCNN [15], and dilated CNNs have shown strong
the degradation of social values within families and performance on benchmark tasks such as sentiment analysis,
communities. Hadi et al. [7] underscore the importance of spam detection, and question classification, especially when
education in combating the spread of online gambling paired with pretrained embeddings. However, their limitation
content, particularly spam comments frequently found on lies in capturing long-range dependencies and global
social media and public forums. Collectively, these studies context—something that transformers handle more naturally.
reinforce the argument that spam comments promoting online On the other hand, transformer-based architectures have
gambling are not merely a nuisance but represent a complex become the backbone of modern NLP systems due to their
societal threat that undermines the moral and social resilience superior ability to model context and capture semantic
of Indonesian society. nuances. Beyond BERT, variants like DistilBERT [16],
According to a review by Chrismanto et al. [8], detecting ALBERT [17], TinyBERT [18], and MobileBERT [19] have
spam in Bahasa Indonesia is non-trivial due to its linguistic been proposed to reduce model size and inference time while
complexity. Informal grammar, regional slang, frequent retaining much of the performance of their larger
abbreviations, and code-mixing with English make counterparts. More recent innovations such as Linformer,
preprocessing—like tokenization and normalization—more Performer, and Longformer aim to reduce the quadratic
difficult. These issues are worsened by the scarcity of complexity of self-attention, making transformers more
standardized datasets for Bahasa Indonesia, limiting model scalable for longer sequences or deployment on low-resource
development and comparison. Additionally, spam comments devices. These models have demonstrated that with careful
are often short, emoji-heavy, and context-dependent, making design, efficiency and effectiveness can co-exist, opening
them harder to detect using typical keyword-based or new opportunities for building real-time NLP applications
language-agnostic approaches. even in low-resource settings.
We review some approaches to text classification from a Despite advances in content moderation, spam comments
top-cited paper [9]. Early approaches to text classification promoting Judi Online continue to flood Indonesian digital
largely relied on traditional machine learning (ML) models spaces—particularly during live YouTube sessions hosted by
such as Support Vector Machines (SVM) [10] and Random local streamers and content creators. The persistence of such
Forests (RF) [11], which depend heavily on manual feature content, even on platforms as technologically advanced as
engineering—like bag-of-words, TF-IDF, and POS-tagged Google’s YouTube, underscores the challenge of filtering
terms. While effective to a degree, these models struggle with spam in low-resource languages like Bahasa Indonesia.
capturing contextual and sequential nuances in language. As This study is motivated by the urgent need for more
tasks became more complex and data grew, deep learning effective, language-specific spam detection models. We aim
(DL) models began to dominate. Convolutional Neural to compare the performance of traditional machine learning
Networks (CNNs) proved effective in detecting local patterns models (SVM, RF), standard deep learning approaches
like spam phrases, while Recurrent Neural Networks (RNNs) (CNN, BERT), and our custom lightweight transformer
and Long Short-Term Memory (LSTM) networks helped in architecture called Wordformer. While models like BERT
modeling sequential dependencies. More recently, offer state-of-the-art accuracy, their computational demands
transformer-based architectures such as BERT [12] have limit real-time deployment on resource-constrained systems.
redefined the state of the art by leveraging self-attention Thus, our study seeks not only to measure predictive accuracy
mechanisms to model global context without the sequential but also to highlight the trade-offs between efficiency and
limitations of RNNs. effectiveness—crucial for practical applications in regional
However, these advancements come with a trade-off: and low-resource settings.
performance vs. efficiency. Large-scale models like BERT This study addresses the persistent challenge of detecting
offer superior accuracy but are computationally expensive online gambling (Judi Online) spam comments in Bahasa
and memory-intensive. This has led to a growing interest in Indonesia—a task complicated by informal language use and
lightweight models—including compact CNNs and efficient limited NLP resources. While existing solutions have shown
transformers—that seek to balance strong performance with promise in high-resource settings, their effectiveness in
lower resource demands [13]. This study embraces that trend regional languages remains insufficient. The core problem
by evaluating both traditional ML and diverse DL models, lies in identifying which modeling approach—traditional ML,
including a custom lightweight transformer, for spam standard DL, or lightweight architectures—best balances
detection in Bahasa Indonesia. accuracy and computational efficiency. To this end, our study
In recent years, CNN-based models for NLP have seen poses two primary research questions:
renewed interest, particularly in scenarios where 1) How do traditional machine learning models and deep
computational constraints or real-time requirements limit the learning architectures perform in classifying
feasibility of larger transformer architectures. Unlike their use Indonesian online gambling spam comments?
in computer vision, CNNs in text classification act as local n- 2) Can Wordformer, our proposed lightweight
gram detectors, capturing short-range dependencies with transformer model, deliver competitive performance
relatively low computational cost. Variants like TextCNN while significantly reducing computational overhead?
Comparative Analysis of CNN, Transformers, and Traditional ML for Classifying Online Gambling Spam Comments in
Indonesian (Martin Clinton Tosima Manullang, Arkham Zahri Rakhman, Hartanto Tantriawan, Andika Setiawan)

| 594                                                     |     |     |     |     |     |     |             |     |        e-ISSN: 2548-6861   |     |     |     |     |
| ------------------------------------------------------- | --- | --- | --- | --- | --- | --- | ----------- | --- | -------------------------- | --- | --- | --- | --- |
| The primary objective of this study is to evaluate and  |     |     |     |     |     |     | A. Dataset  |     |                            |     |     |     |     |
compare the performance of various machine learning and
|                 |     |                   |     |       |         |          | This      | study  | utilizes  | a  publicly  | available  | dataset  | titled  |
| --------------- | --- | ----------------- | --- | ----- | ------- | -------- | --------- | ------ | --------- | ------------ | ---------- | -------- | ------- |
| deep  learning  |     | models—including  |     | SVM,  | Random  | Forest,  |           |        |           |              |            |          |         |
|                 |     |                   |     |       |         |          | “Deteksi  | Judi   | Online”   |              | sourced    | from     | Kaggle  |
CNN, BERT, and our custom Wordformer—for classifying  (https://www.kaggle.com/datasets/yaemico/deteksi-judi-
Judi Online spam comments written in Bahasa Indonesia. The  online) [20]. The dataset comprises 6,351 user comments
| evaluation  | considers  |     | both  predictive  |     | performance  | and  |     |     |     |     |     |     |     |
| ----------- | ---------- | --- | ----------------- | --- | ------------ | ---- | --- | --- | --- | --- | --- | --- | --- |
collected from the live YouTube broadcast “Wayang Jogja
computational efficiency. The scope is limited to monolingual
|     |     |     |     |     |     |     | Night  Carnival  |     | #9”,  hosted  | by  | the  @TribunJogjaOfficial  |     |     |
| --- | --- | --- | --- | --- | --- | --- | ---------------- | --- | ------------- | --- | -------------------------- | --- | --- |
spam detection using a custom-labeled dataset collected from  channel in celebration of the 268th anniversary of Yogyakarta
Indonesian YouTube comment sections. While basic text
City. The data was originally gathered to analyze the presence
| preprocessing  |     | is  applied,  | the  | study  | does  not  | incorporate  |     |     |     |     |     |     |     |
| -------------- | --- | ------------- | ---- | ------ | ---------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
of online gambling (Judi Online) promotions in live chat
| advanced linguistic techniques such as syntactic parsing or  |     |     |     |     |     |     | interactions.  |     |     |     |     |     |     |
| ------------------------------------------------------------ | --- | --- | --- | --- | --- | --- | -------------- | --- | --- | --- | --- | --- | --- |
cross-lingual modeling. Additionally, the focus remains on
Each data entry includes metadata such as the timestamp
offline classification performance, without integrating the
|     |     |     |     |     |     |     | (datetime),  | commenter  |     | name  (author_name),  |     | the  | original  |
| --- | --- | --- | --- | --- | --- | --- | ------------ | ---------- | --- | --------------------- | --- | ---- | --------- |
models  into  real-time  systems  or  deploying  them  in  comment  (message),  a  pre-cleaned  version
production environments.  (cleaned_message), and a binary label indicating whether the
This study contributes to the growing body of research on
comment contains online gambling promotion (1) or not (0).
spam detection by offering a focused evaluation of model  For the purpose of this research, we chose to ignore the
performance in a low-resource, language-specific context. By  cleaned_message  field  and  instead  applied  our  own
comparing a range of traditional and modern architectures—
standardized preprocessing pipeline to ensure consistency
including the proposed Wordformer—it provides valuable
across all models.
insight into how accuracy and computational cost trade off in  All  experiments  were  conducted  using  5-fold  cross-
| real-world  | spam  | filtering  | scenarios.  |     | The  inclusion  | of  a  |     |     |     |     |     |     |     |
| ----------- | ----- | ---------- | ----------- | --- | --------------- | ------ | --- | --- | --- | --- | --- | --- | --- |
validation, with the same data splits applied uniformly across
lightweight yet high-performing transformer model highlights
every evaluated method to ensure fair comparison and reduce
the feasibility of deploying efficient solutions on regional  variance due to data partitioning.
platforms,  especially  where  computational  resources  are  The dataset was annotated manually by the original dataset
limited. Ultimately, this work supports the development of
creator and includes binary labels (1 for online gambling
more robust moderation tools tailored to the linguistic and
spam, 0 for non-spam). Since it is a public dataset, it supports
behavioral characteristics of Indonesian online communities.  reproducibility and provides a useful benchmark for future
This thesis is structured as follows. Chapter 2 presents a
studies. While the dataset is specific to a single event and
literature review covering prior research on spam detection
YouTube source, it reflects real-world usage and typical spam
and relevant machine learning and deep learning techniques.  behavior in Indonesian live chat environments.
| Chapter  | 2  details  |     | the  methodology,  |     | including  | dataset  |     |     |     |     |     |     |     |
| -------- | ----------- | --- | ------------------ | --- | ---------- | -------- | --- | --- | --- | --- | --- | --- | --- |
construction, preprocessing steps, and model configurations.  B. Data Preprocessing
Chapter  3  reports  and  compares  the  results.  Chapter  4  To prepare the input text for modeling, a standardized
discusses the findings, limitations, and implications. Finally,  preprocessing pipeline was applied to the raw message field.
Chapter 5 concludes the study and suggests directions for
|     |     |     |     |     |     |     | Each  step  | was  | designed  | to  | clean  informal  | Indonesian  |     |
| --- | --- | --- | --- | --- | --- | --- | ----------- | ---- | --------- | --- | ---------------- | ----------- | --- |
future work.
comments while preserving the semantic content relevant to
|     |     |     |               |     |     |     | spam  classification.  |     | The  | following  | transformations  |     | were  |
| --- | --- | --- | ------------- | --- | --- | --- | ---------------------- | --- | ---- | ---------- | ---------------- | --- | ----- |
|     |     |     | II. METHODS   |     |     |     | used:                  |     |      |            |                  |     |       |
This  chapter  outlines  the  methodology  employed  to  •  Lowercasing: All text was converted to lowercase to
investigate the performance of various machine learning and  reduce vocabulary size. Example: “GRATIS JOIN
deep learning models for classifying online gambling (Judi
SEKARANG!!!” become “gratis join sekarang!!!”
Online) spam comments in Bahasa Indonesia. The focus is on
•  URL removal: Spam links were removed using regular
ensuring a fair and consistent evaluation across all approaches  expressions. Example: “kunjungi http://judi123.com
| by  using  | a   | standardized  | dataset,  | uniform  |     | preprocessing  |     |     |     |     |     |     |     |
| ---------- | --- | ------------- | --------- | -------- | --- | -------------- | --- | --- | --- | --- | --- | --- | --- |
sekarang!” become “kunjungi sekarang!”
| pipeline,  | and  | shared  | evaluation  | protocol.  | We  | begin  by  |     |     |     |     |     |     |     |
| ---------- | ---- | ------- | ----------- | ---------- | --- | ---------- | --- | --- | --- | --- | --- | --- | --- |
•  Mention and hashtag removal: Mentions (@username)
describing the dataset and preprocessing steps, followed by a  and hashtags (#promo) were stripped as they added
breakdown of the model architectures—including traditional
little value. Example: “@user ayo join sekarang #judi”
| classifiers,  | deep  | learning  | baselines,  |     | and  | our  proposed  |     |     |     |     |     |     |     |
| ------------- | ----- | --------- | ----------- | --- | ---- | -------------- | --- | --- | --- | --- | --- | --- | --- |
become “ayo join sekarang”
| lightweight  | transformer  |     | model,  | Wordformer.  |     | The  chapter  |     |     |     |     |     |     |     |
| ------------ | ------------ | --- | ------- | ------------ | --- | ------------- | --- | --- | --- | --- | --- | --- | --- |
•  Emoji and symbol cleaning: Non-textual characters
| concludes  | with  | details  | on  | training  | configurations,  |     |     |     |     |     |     |     |     |
| ---------- | ----- | -------- | --- | --------- | ---------------- | --- | --- | --- | --- | --- | --- | --- | --- |
such as emojis and decorative symbols were replaced
performance metrics, and the computing environment used
with spaces. Example: “🎰 join sekarang ‼️” become
for experimentation.
“join sekarang”

|     |     |     |     |     |     |     | •  Whitespace  |     | normalization:  |     | Extra  | spaces  | were  |
| --- | --- | --- | --- | --- | --- | --- | -------------- | --- | --------------- | --- | ------ | ------- | ----- |

collapsed to single spaces for token consistency.

JAIC Vol. 9, No. 3, June 2025:  592 – 602

JAIC e-ISSN: 2548-6861 595
After preprocessing, tokenization was model-dependent. D. Model Architectures
For BERT-based models, we used the tokenizer from the This section outlines the architectures and configurations
pretrained model indobenchmark/indobert-base-p1, a of all models evaluated in this study, beginning with
language model specifically trained on large-scale Bahasa traditional machine learning approaches.
Indonesia corpora. This tokenizer applies subword 1). Traditional Machine Learning Models: To establish a
segmentation using the WordPiece algorithm, which helps baseline, two well-known traditional machine learning
handle out-of-vocabulary and rare Indonesian terms. classifiers were employed: SVM and RF
For other models (CNN, Wordformer, and traditional SVM is a discriminative classifier that constructs a
ML), we used a simple whitespace-based tokenizer to split hyperplane to separate classes with the maximum margin. It
preprocessed text into tokens. This consistent pipeline is known for its robustness in high-dimensional spaces and its
ensured that all models received comparable inputs, while the effectiveness in sparse text data. A linear kernel was used in
use of a domain-appropriate tokenizer (IndoBERT) preserved this study to reduce computational complexity.
language-specific features crucial for high-quality RF is an ensemble learning method that builds multiple
representation learning in Bahasa Indonesia. decision trees during training and outputs the majority class
The preprocessing steps applied in this study include as the final prediction. Its inherent capability to handle noisy
lowercasing, URL removal, punctuation and symbol cleaning, data and perform implicit feature selection makes it suitable
and stopword removal using the NLTK Indonesian stopword for this task.
list. Tokenization is performed using nltk.word_tokenize, Both models rely on TF-IDF (Term Frequency–Inverse
which handles basic segmentation of informal Indonesian Document Frequency) vectorization to transform raw text into
text. While this study does not explicitly normalize disguised numerical features. The text was first tokenized using
spam variants, the models are trained on real spam patterns, whitespace-based splitting (after preprocessing), and n-grams
enabling them to implicitly learn such variations. Addressing ranging from unigrams to trigrams were extracted to capture
spelling variations and slang normalization remains a both individual words and short phrases. The final feature
potential direction for future work. vectors are sparse and high-dimensional, capturing
frequency-weighted word and phrase occurrences. These are
C. Data Augmentation
then fed into the respective classifiers without dimensionality
To improve model robustness and reduce overfitting, we
reduction, allowing the models to leverage the full token
applied text augmentation techniques during training.
structure.
Augmentation was controlled via a probability parameter
For traditional machine learning models such as SVM and
p_augment (default: 0.5), meaning each training sample had
Random Forest, TF-IDF vectorization is used as the feature
a 50% chance of being augmented. The augmentation
representation. For deep learning models like CNN and
framework supported various methods designed to simulate
Wordformer, embeddings are randomly initialized and
lexical variation and noise commonly found in spam content,
learned during training. This ensures that deep learning
especially in informal Indonesian.
models start without any pretrained information, maintaining
a fair experimental setup.
The methods include synonym replacement, where
2). CNN based model: The CNN model used in this study
random non-stopword tokens are substituted with synonyms
is a lightweight, modular architecture designed specifically
using WordNet; random deletion, which removes tokens with
for short-text classification, inspired by Kim's CNN model
a small probability to mimic noisy inputs; random swap,
[21]. Its structure follows a straightforward flow, with clearly
where two words in the sentence are randomly exchanged;
defined stages in the forward pass that transform raw token
and random insertion, where new synonyms are inserted at
sequences into a final prediction score.
random positions. Additionally, a simulated back-translation
The process begins with the embedding layer, which
mechanism introduces minor distortions such as article
converts each token index into a fixed-size dense vector. This
removal, word reordering, and synonym substitution to mimic
layer is implemented using the nn.Embedding in the PyTorch
translation artifacts. A cascaded augmentation mode
framework, where the embeddings are randomly initialized
sequentially applies multiple of these techniques for greater
and trained jointly with the model parameters. This approach
diversity.
is consistently applied to both the CNN and Wordformer
models to ensure a fair comparison between architectures.
When the augmentation method is set to 'random', one of
The CNN model processes tokenized text through parallel
these strategies is selected randomly per sample. The
1D convolutional layers with kernel sizes of 3, 4, and 5, each
augmentation system supports Bahasa Indonesia by filtering
acting as n-gram detectors. Max-over-time pooling is applied
stopwords based on language-specific lists, although
to each feature map, selecting the most important activation
synonym lookup remains a challenge due to limited
per channel. The pooled outputs are concatenated, passed
Indonesian lexical resources. This strategy helps expose the
through a dropout layer, and finally classified by a fully
models to lexical variability, improving generalization across
connected linear layer. This multi-channel 1D CNN structure
informal or adversarially structured spam text.
Comparative Analysis of CNN, Transformers, and Traditional ML for Classifying Online Gambling Spam Comments in
Indonesian (Martin Clinton Tosima Manullang, Arkham Zahri Rakhman, Hartanto Tantriawan, Andika Setiawan)

| 596        |     |     |     |     |     |     |     |     |        e-ISSN: 2548-6861   |     |     |     |     |
| ---------- | --- | --- | --- | --- | --- | --- | --- | --- | -------------------------- | --- | --- | --- | --- |
enables the model to capture diverse local patterns within
short Indonesian spam comments.
| The  embedding  |     | dimension  |     | is  set  | to  300,  | and  the  |     |     |     |     |     |     |     |
| --------------- | --- | ---------- | --- | -------- | --------- | --------- | --- | --- | --- | --- | --- | --- | --- |
embedding layer is trainable, allowing it to adapt to domain-
specific usage common in Indonesian spam text. The output
| of  this  | layer  | is  a  | tensor  of  | shape  | (batch_size,  |     |     |     |     |     |     |     |     |
| --------- | ------ | ------ | ----------- | ------ | ------------- | --- | --- | --- | --- | --- | --- | --- | --- |
sequence_length, embedding_dim), which is then
| permuted       | to  align  | with         | PyTorch’s  | expected        |        | input  for  |     |     |     |     |     |     |     |
| -------------- | ---------- | ------------ | ---------- | --------------- | ------ | ----------- | --- | --- | --- | --- | --- | --- | --- |
| convolutional  |            | operations,  | resulting  |                 | in  a  | shape  of   |     |     |     |     |     |     |     |
| (batch_size,   |            |              |            | embedding_dim,  |        |             |     |     |     |     |     |     |     |
sequence_length).
Next, the model applies three parallel 1D convolutional
layers, each with different kernel sizes—specifically 3, 4, and
5. These layers act as n-gram feature extractors, where the
kernel size determines how many consecutive tokens are
considered at a time. Each convolutional block uses 100
output channels, meaning that for each kernel size, the model
| learns  100 distinct  |        | filters. A  | ReLU         | activation  |            | is  applied  |     |     |     |     |     |     |     |
| --------------------- | ------ | ----------- | ------------ | ----------- | ---------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
| immediately           | after  | each        | convolution  | to          | introduce  | non-         |     |     |     |     |     |     |     |
linearity.
Following convolution, each feature map undergoes max
pooling over time. This operation compresses each feature
map to its most significant activation, resulting in one value
per filter. Since there are 100 filters for each of the three
kernel sizes, the pooled outputs produce a combined feature
vector of size 300 per input comment (100 × 3). These outputs
are concatenated and passed through a dropout layer with a
dropout rate of 0.5 to prevent overfitting.  Figure 1. The CNN based architecture
Finally,  the  feature  vector  is  processed  by  a  fully  3). BERT: Bidirectional Encoder Representations from
connected  linear  layer  that  reduces  the  300-dimensional  Transformers (BERT) is a deep learning model developed by
vector to a single logit. This output is passed through a  Google that has become a cornerstone in modern NLP. Unlike
sigmoid activation function to produce a probability between  traditional models that read text sequentially, BERT uses a
0 and 1, indicating the likelihood that the input comment is  bidirectional transformer architecture to capture both left and
promoting online gambling. The visualisation of this deep  right context simultaneously. This allows BERT to better
|     |     |     |     |     |     |     | understand  | the  | meaning  | of  words  | based  | on  surrounding  |     |
| --- | --- | --- | --- | --- | --- | --- | ----------- | ---- | -------- | ---------- | ------ | ---------------- | --- |
learning architecture can be seen on Figure 1.
context, which is especially useful for ambiguous or informal
expressions common in social media comments.
In this study, we use the indobenchmark/indobert-base-p1
variant [22], a version of BERT pretrained specifically on
large-scale Bahasa Indonesia corpora. This choice ensures the
|     |     |     |     |     |     |     | model  is   | well-adapted  | to         | the  linguistic  |            | characteristics  | of       |
| --- | --- | --- | --- | --- | --- | --- | ----------- | ------------- | ---------- | ---------------- | ---------- | ---------------- | -------- |
|     |     |     |     |     |     |     | Indonesian  | text,         | providing  | an               | advantage  | over             | general  |
multilingual models. The model can be obtained from the
|     |     |     |     |     |     |     | internet  |     | using  |     | this  |     | link  |
| --- | --- | --- | --- | --- | --- | --- | --------- | --- | ------ | --- | ----- | --- | ----- |
https://huggingface.co/indobenchmark/indobert-base-p1. The
fine-tuning process involves adding a simple classification
head (a fully connected linear layer) on top of the [CLS] token
output from BERT. The [CLS] token serves as a summary
representation of the entire input sequence. During training,
the entire BERT model, including the pretrained transformer
layers is updated.
IndoBERT shares the same architecture as the original
BERT-Base model proposed by Devlin et al. [12]: it consists
of 12 transformer layers (encoder blocks), each with 12 self-
attention heads, a hidden size of 768, and a feedforward layer
of size 3072. The model contains approximately 124.5 million
JAIC Vol. 9, No. 3, June 2025:  592 – 602

| JAIC  |     |     |     |     | e-ISSN: 2548-6861  |     |     |     |     |     |     |     |     | 597  |
| ----- | --- | --- | --- | --- | ------------------ | --- | --- | --- | --- | --- | --- | --- | --- | ---- |

parameters and uses SentencePiece with Byte-Pair Encoding  Unlike BERT, Wordformer does not rely on a special
(BPE) to tokenize inputs into subwords, allowing it to manage  [CLS] token; instead, it applies mean pooling across the token
morphological  variants  commonly  found  in  Bahasa  dimension to produce a single vector that represents the entire
Indonesia. BERT architecture can be seen on Figure 2.  input  sequence.  This  pooled  output  is  regularized  using
dropout and then passed to a final linear layer with a single
output unit, followed by a sigmoid activation to generate a
binary prediction. The forward method cleanly outlines this
|     |     |     |     |     |     |     |     | sequence:  | embedding,  |     | positional  | encoding,  | transformer  |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ---------- | ----------- | --- | ----------- | ---------- | ------------ | --- |
encoding, mean pooling, and classification. This compact
design allows Wordformer to offer much lower memory and
runtime cost compared to BERT, while still benefiting from
the strength of attention-based representation learning. As
|     |     |     |     |     |     |     |     | such,  Wordformer  |     | is  | well-suited  | for  | real-time  | spam  |
| --- | --- | --- | --- | --- | --- | --- | --- | ------------------ | --- | --- | ------------ | ---- | ---------- | ----- |
moderation scenarios, especially in environments with limited
|     |     |     |     |     |     |     |     | computational  | resources.  |     | The  | detailed  | architecture  | of  |
| --- | --- | --- | --- | --- | --- | --- | --- | -------------- | ----------- | --- | ---- | --------- | ------------- | --- |
Wordformer can be seen on Figure 3.
|     |     |     |     |     |     |     |     | Technically,  |          | Wordformer  | consists  |                    | of  3  | stacked  |
| --- | --- | --- | --- | --- | --- | --- | --- | ------------- | -------- | ----------- | --------- | ------------------ | ------ | -------- |
|     |     |     |     |     |     |     |     | transformer   | encoder  | layers,     | each      | using  multi-head  |        | self-    |
attention with 4 attention heads, and a 256-dimensional feed-
forward network. The embedding size is set to 128, and a
sinusoidal positional encoding is added to preserve token
order information. The model includes LayerNorm, dropout
(rate 0.1), and GELU activation in the feedforward sublayer.
Token representations are pooled using mean pooling (instead
of a [CLS] token), and passed through a linear classifier. This
|     |     |     |     |     |     |     |     | entire  | architecture  |     | is  | implemented  |     | using  |
| --- | --- | --- | --- | --- | --- | --- | --- | ------- | ------------- | --- | --- | ------------ | --- | ------ |
nn.TransformerEncoderLayer in PyTorch and designed to
remain light and interpretable

Figure 2. BERT architecture
4). Wordformer: To address the need for an efficient yet
expressive spam classification model, this study introduces
| Wordformer,  | a     | lightweight  | transformer-based  |         |           | architecture  |      |     |     |     |     |     |     |     |
| ------------ | ----- | ------------ | ------------------ | ------- | --------- | ------------- | ---- | --- | --- | --- | --- | --- | --- | --- |
| designed     | from  | scratch.     | Notably,           | unlike  | TinyBERT  |               | and  |     |     |     |     |     |     |     |
DistilBERT which employ knowledge distillation from pre-
trained BERT models, Wordformer is trained entirely from
scratch with randomly initialized weights and does not rely on
| any  pre-trained  |          | BERT           | parameters.  |     | The   | model          | draws     |     |     |     |     |     |     |     |
| ----------------- | -------- | -------------- | ------------ | --- | ----- | -------------- | --------- | --- | --- | --- | --- | --- | --- | --- |
| inspiration       | from     | transformer    | encoders     |     | like  | those          | used  in  |     |     |     |     |     |     |     |
| BERT              | but  is  | significantly  | simplified   |     | for   | computational  |           |     |     |     |     |     |     |     |
efficiency. The input token IDs are first converted into dense
| vectors       | through  | a  trainable  |     | embedding  | layer  | of         | shape  |     |     |     |     |     |     |     |
| ------------- | -------- | ------------- | --- | ---------- | ------ | ---------- | ------ | --- | --- | --- | --- | --- | --- | --- |
| (vocab_size,  |          | emb_dim),     |     | where      | the    | embedding  |        |     |     |     |     |     |     |     |
dimension is set to 128. To preserve sequential information,
which transformers do not inherently capture a sinusoidal
positional encoding is added to the embeddings. The core of
| Wordformer  | is  | a  single  | nn.TransformerEncoderLayer  |     |     |     |     |     |     |     |     |     |     |     |
| ----------- | --- | ---------- | --------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
module, which processes the input in parallel using multi-
head self-attention. This layer is configured with a model
| dimension  | of  128,  | 4  attention  |     | heads,  | a  256-dimensional  |     |     |     |     |     |     |     |     |     |
| ---------- | --------- | ------------- | --- | ------- | ------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
feedforward layer, ReLU activation, and a dropout rate of 0.1.

| The  output  | from  | this  encoder  |     | layer  | is  passed  | through a  |     |     |     |     |     |     |     |     |
| ------------ | ----- | -------------- | --- | ------ | ----------- | ---------- | --- | --- | --- | --- | --- | --- | --- | --- |
Figure 3. Wordformer Architecture
nn.TransformerEncoder, capturing contextual representations
| across the sequence.  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |
| --------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Comparative Analysis of CNN, Transformers, and Traditional ML for Classifying Online Gambling Spam Comments in
Indonesian (Martin Clinton Tosima Manullang, Arkham Zahri Rakhman, Hartanto Tantriawan, Andika Setiawan)

598 e-ISSN: 2548-6861
E. Training Strategy
Precision⋅Recall
All models in this study were trained using a unified and F1=2⋅
Precision+Recall
reproducible strategy designed for robust evaluation and fair
comparison. For deep learning models (CNN, BERT, and We report both macro-F1, which averages F1 scores
Wordformer), training was performed using binary cross- equally across all classes, and weighted-F1, which considers
entropy loss, optimized with the Adam optimizer. The initial class imbalance by weighting each class by its support. AUC
learning rate was set to 1e-5, with weight decay of 0.01 evaluates the ranking quality of predicted probabilities,
applied for regularization. A learning rate scheduler with capturing the model’s ability to distinguish between classes.
ReduceLROnPlateau strategy was used: if the validation Validation Loss is calculated using binary cross-entropy,
measuring the model’s confidence in its probabilistic
score did not improve after 2 epochs (lr_patience), the
predictions. Confusion Matrix provides a tabular breakdown
learning rate was reduced by a factor of 0.5. This helped
of true positives (TP), true negatives (TN), false positives
prevent stagnation during optimization.
(FP), and false negatives (FN), giving a direct view of
Training was conducted for a maximum of 35 epochs with
classification correctness per class.
a batch size of 32, and a maximum sequence length of 128 for
Together, these metrics offer a balanced assessment of
all models. Early stopping was enabled, with a patience of 6
both general performance and the model’s handling of class
epochs, meaning training would halt if the validation F1-score
imbalance—critical in spam detection tasks where false
did not improve within that window. During training, the best-
positives and false negatives carry different practical risks.
performing model checkpoint (based on validation F1-score)
was saved for each fold.
G. Computing Environment
To improve generalization and mitigate overfitting,
All experiments in this study were conducted using a high-
dropout was applied (with a rate of 0.2) before the
performance workstation equipped with an Intel(R) Xeon(R)
classification layers. Additionally, five-fold cross-validation
Silver 4215R CPU @ 3.20GHz, 32 GB of RAM, and an
was used across all models, ensuring that the same data splits
NVIDIA Quadro RTX 5000 GPU. The models were
were consistently applied.
implemented using the PyTorch deep learning framework
For reproducibility, the random seed was fixed to 42, and
with CUDA support, enabling efficient training of resource-
all experiments were logged using Weights & Biases (wandb)
intensive architectures like BERT and Wordformer.
when enabled. Model outputs, logs, and checkpoints were
To ensure broader accessibility, the implementation is
stored in a specified output directory for each run. This setup
compatible with CPU-only environments and Apple’s Metal
ensures not only fair and consistent evaluation across
Performance Shaders backend for macOS. However, it is
different model families but also supports stable convergence
important to note that while the code can run on these
and transparent model tracking throughout the training
platforms, performance may be significantly slower and not
lifecycle.
suitable for large-scale training.
F. Performance Metrices
III. RESULTS
To comprehensively evaluate model performance, we
This chapter presents the experimental results obtained
employed a range of classification metrics computed on the
from evaluating five different models on the task of detecting
validation set for each fold. These include accuracy,
online gambling spam comments in Bahasa Indonesia. The
precision, recall, F1-score (macro and weighted), AUC (Area
evaluation is divided into two main parts: a benchmark
Under the ROC Curve), and the confusion matrix.
comparison of three deep learning models (CNN, IndoBERT,
Accuracy measures the proportion of correct predictions
and the proposed Wordformer) and two traditional machine
across all classes:
learning algorithms (SVM and Random Forest), followed by
TP + TN
an ablation study examining the impact of key architectural
Accuracy =
TP + TN + FP + FN and training hyperparameters on Wordformer’s performance.
All results are reported using standard classification metrics
Precision calculates the ratio of correctly predicted
and are averaged across five-fold cross-validation to ensure
positive observations to all predicted positives:
robustness and reliability. All running results were logged
𝑇𝑃 into Wandb platform and can be accessed using this url
Precision=
𝑇𝑃+𝐹𝑃 https://wandb.ai/mctosima/youtube-comment-spam. We
intentionally open the code to offer more opportunity for
Recall (or sensitivity) calculates the ratio of correctly
reproducing this study in
predicted positive observations to all actual positives:
https://github.com/mctosima/online_bet_spam_detection
𝑇𝑃
Recall=
𝑇𝑃+𝐹𝑁
F1-Score is the harmonic mean of precision and recall:
JAIC Vol. 9, No. 3, June 2025: 592 – 602

JAIC e-ISSN: 2548-6861 599
TABLE I
BENCHMARK RESULTS
Method Accuracy Weighted F1 Macro F1 Precision Recall AUC
Support Vector Machine 0.957781 0.95772 0.9577 0.957781 0.9577819 0.9577
Random Forest 0.9729048 0.972893 0.972895 0.9522081 0.97299022 0.97289
IndoBERT 0.999684 0.9997 0.99968 0.9986854 0.9996849 0.999686
CNN-Based 0.9935392 0.9935367 0.993537 0.99377606 0.9935392 0.9935643
Wordformer 0.997479 0.9974791 0.997479 0.9974944 0.997479 0.997483
Best results are marked with bold, second best marked with italic
operations, and disk size. As expected, IndoBERT is by far
A. Benchmark Results
the largest model, containing over 66 million parameters,
Table I presents the benchmark results of five models
requiring approximately 530 million multiply-adds, and
evaluated on the spam classification task using Indonesian
occupying nearly 695 MB of storage. In contrast, the
YouTube comments. Among all models, IndoBERT
proposed Wordformer model is significantly more efficient,
consistently achieved the best overall performance across
with roughly 9.4 million parameters, 75 million multiply-
every metric, with an accuracy of 0.9997, macro F1 of 0.9997,
adds, and a model size of 96.34 MB. The CNN-based model
and near-perfect scores in precision (0.9987), recall (0.9997),
falls between these two in size and compute, with over 3
and AUC (0.9997). This highlights IndoBERT’s capability to
million parameters and 144 million multiply-adds. Traditional
handle the informal and noisy nature of real-world spam text
models such as SVM and Random Forest have minimal
in Bahasa Indonesia.
complexity, with just 4,511 and 11,100 parameters
The proposed Wordformer model performed remarkably
respectively, and model sizes well under 0.1 MB. Multiply-
well, achieving an accuracy of 0.9975, macro F1 of 0.9975,
add operations are not reported for these two, as such
and high scores across all other metrics including precision
operations are not typically meaningful or comparable for
(0.9975), recall (0.9975), and AUC (0.9975). It ranks second
non-neural models. These results provide a foundational
across the board and serves as a strong alternative to heavier
comparison of the resource demands associated with each
transformer models.
model architecture.
The CNN-based model also demonstrated solid results,
with an accuracy of 0.9935 and macro F1 of 0.9935, reflecting
TABLE II
its effectiveness in learning local spam patterns through COMPLEXITY BENCHMARK
convolutional filters. Its precision and recall were slightly
lower than those of Wordformer, but it still maintained robust Method # Params # Multiply Model Size
classification quality. Adds (M) (MB)
Meanwhile, the traditional machine learning models, SVM 4511 n/a 0.03
Support Vector Machine (SVM) and Random Forest (RF),
Random Forest 11100 n/a 0.08
showed weaker performance. SVM achieved an accuracy of
0.9578 and macro F1 of 0.9577, while RF reached 0.9729 in IndoBERT 66,660,101 530.53 695.29
both metrics. Although these models are computationally
CNN-Based 3,173,102 144.56 15.92
lighter, their performance across all metrics was noticeably
Wordformer 9,429,509 75.17 96.34
below that of the deep learning approaches.
Analysis of the confusion matrices shows that IndoBERT
commits only a single false positive and a single false
negative; Wordformer produces two false positives and three C. Ablation Study
false negatives; the CNN baseline yields four false positives
Table III shows the ablation benchmark between different
and four false negatives; and even the Random Forest and
hyperparameters.
SVM models keep false positives and false negatives to only
The number of transformer layers significantly impacted
six and four samples, respectively—demonstrating that all
performance. The model with only one layer showed the
methods restrict misclassification counts to the low single
weakest results (Accuracy: 0.9551), while the two-layer
digits.
version slightly improved across all metrics. The best
B. Computational Complexity performance was achieved with three layers, reaching 0.9962
accuracy and 0.9962 macro F1, suggesting that a deeper
Table II summarizes the computational complexity of each
model in terms of parameter count, number of multiply-add
Comparative Analysis of CNN, Transformers, and Traditional ML for Classifying Online Gambling Spam Comments in
Indonesian (Martin Clinton Tosima Manullang, Arkham Zahri Rakhman, Hartanto Tantriawan, Andika Setiawan)

| 600          |     |     |     |     |     |        e-ISSN: 2548-6861   |     |     |     |
| ------------ | --- | --- | --- | --- | --- | -------------------------- | --- | --- | --- |
TABLE III
ABLATION STUDY
Ablation Study  Accuracy  Weighted F1  Macro F1  Precision  Recall  AUC
| Transformer Block Number  |     |     |     |     |     |     |     |     |     |
| ------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
•  1 Layer  0.95511  0.9550  0.95511  0.958  0.95511  0.95512
| •  2 Layer              |     | 0.9503  |     | 0.9503  | 0.95033  | 0.9526  |     | 0.9503  | 0.9505  |
| ----------------------- | --- | ------- | --- | ------- | -------- | ------- | --- | ------- | ------- |
| •  3 Layer              |     | 0.996   |     | 0.996   | 0.996    | 0.996   |     | 0.996   | 0.996   |
| Embedded Dimension      |     |         |     |         |          |         |     |         |         |
| •  100                  |     | 0.996   |     | 0.996   | 0.996    | 0.996   |     | 0.996   | 0.996   |
| •  128                  |     | 0.998   |     | 0.998   | 0.998    | 0.998   |     | 0.998   | 0.998   |
| Feed Forward Dimension  |     |         |     |         |          |         |     |         |         |
| •  256                  |     | 0.985   |     | 0.985   | 0.985    | 0.985   |     | 0.985   | 0.985   |
|                         |     | 0.996   |     | 0.996   | 0.996    | 0.996   |     | 0.996   | 0.996   |
•  512
| Number of Heads  |     |         |     |         |         |         |     |         |         |
| ---------------- | --- | ------- | --- | ------- | ------- | ------- | --- | ------- | ------- |
|                  |     | 0.9952  |     | 0.9952  | 0.9952  | 0.9952  |     | 0.9952  | 0.9952  |
•  2
|     |     | 0.9960  |     | 0.9960  | 0.9960  | 0.9960  |     | 0.9960  | 0.9960  |
| --- | --- | ------- | --- | ------- | ------- | ------- | --- | ------- | ------- |
•  4
| Dropout         |     |        |     |        |        |        |     |        |        |
| --------------- | --- | ------ | --- | ------ | ------ | ------ | --- | ------ | ------ |
| •  0.1          |     | 0.998  |     | 0.998  | 0.998  | 0.998  |     | 0.998  | 0.998  |
| •  0.2          |     | 0.996  |     | 0.996  | 0.996  | 0.996  |     | 0.996  | 0.996  |
| •  0.3          |     | 0.992  |     | 0.992  | 0.992  | 0.992  |     | 0.992  | 0.992  |
| Learning Rate   |     |        |     |        |        |        |     |        |        |
| •  1e-5         |     | 0.996  |     | 0.996  | 0.996  | 0.996  |     | 0.996  | 0.996  |
| •  5e-5         |     | 0.998  |     | 0.998  | 0.998  | 0.998  |     | 0.998  | 0.998  |
| •  1e-4         |     | 0.998  |     | 0.998  | 0.998  | 0.998  |     | 0.998  | 0.998  |
| Optimizer       |     |        |     |        |        |        |     |        |        |
| •  Adam         |     | 0.992  |     | 0.992  | 0.992  | 0.992  |     | 0.992  | 0.992  |
| •  Adam Weight  |     | 0.996  |     | 0.996  | 0.996  | 0.996  |     | 0.996  | 0.996  |
| •  SGD          |     | 0.953  |     | 0.953  | 0.953  | 0.953  |     | 0.953  | 0.953  |

encoder  enhances  contextual  representation  for  spam  Among the tested optimizers, Adam with class weighting
classification.   achieved the best results (0.996 accuracy, 0.996 macro F1),
In  terms  of  embedding  dimension,  increasing  the  slightly outperforming standard Adam. SGD, on the other
embedding size from 100 to 128 led to consistent performance  hand, lagged behind significantly with reduced precision and
gains  across  all  metrics.  The  128-dimensional  variant  overall score, indicating it’s less suitable for this model and
| achieved 0.998 accuracy and 0.998 macro F1, highlighting  |     |     |     |     | task.  |     |     |     |     |
| --------------------------------------------------------- | --- | --- | --- | --- | ------ | --- | --- | --- | --- |
that richer token embeddings help the model better capture  In summary, the ablation study reveals that Wordformer’s
nuanced differences in text.  performance is sensitive to both architectural and training
The model with a 512-dimensional feedforward layer  hyperparameters.  Deeper  transformer  stacks,  larger
outperformed the smaller 256 variant. The best configuration  embedding  and  feedforward  dimensions,  and  moderate
achieved 0.996 accuracy, indicating that a larger internal  dropout contribute positively to the model’s effectiveness.
representation within the transformer improves its capacity to  Moreover, proper optimizer selection and learning rate tuning
model complex patterns in spam language.  play  a  crucial  role  in  stability  and  convergence.  These
Using  4  attention  heads  led  to  slightly  better  overall  findings provide practical insights for future refinement and
performance  (Accuracy:  0.9962)  compared  to  2  heads  deployment  of  lightweight  transformer  models  in  spam
(0.9952). This suggests that increasing attention granularity  detection tasks, particularly for low-resource languages like
can help the model focus more effectively on diverse semantic  Bahasa Indonesia.
cues in the input.
IV. DISCUSSION
A dropout rate of 0.2 produced the most balanced results,
outperforming both lower (0.1) and higher (0.3) dropout  The  experimental  findings  underscore  the  strength  of
settings. While too little dropout led to potential overfitting,  transformer-based  models  in  classifying  online  gambling
excessive dropout slightly degraded performance, especially  spam comments in Bahasa Indonesia. IndoBERT achieved
in recall and AUC.  near-perfect  performance  across  all  evaluation  metrics,
| The  default  | learning  rate  | of  1e-4  | delivered  | the  best  |            |                  |            |          |                |
| ------------- | --------------- | --------- | ---------- | ---------- | ---------- | ---------------- | ---------- | -------- | -------------- |
|               |                 |           |            |            | affirming  | its  capability  | to  model  | complex  | and  informal  |
outcome  with  0.998  accuracy  and  0.998  macro  F1,  linguistic patterns. Its success is likely due to its extensive
outperforming lower rates like 1e-5 and 5e-5. This suggests  pretraining on a large-scale Indonesian corpus, allowing it to
that Wordformer benefits from a slightly more aggressive  grasp  nuanced  spam  signals  embedded  in  noisy  user-
learning schedule when combined with proper regularization.  generated  text.  However,  this  high  accuracy  comes  at  a
|     |     |     |     |     | significant  | computational  | cost,  | with  IndoBERT  | requiring  |
| --- | --- | --- | --- | --- | ------------ | -------------- | ------ | --------------- | ---------- |
JAIC Vol. 9, No. 3, June 2025:  592 – 602

JAIC e-ISSN: 2548-6861 601
over 66 million parameters, 530 million multiply-adds, and suggest a clear trend: while large-scale pretrained models like
occupying more than 695 MB. Such resource demands may IndoBERT offer unmatched accuracy, carefully designed
be impractical for real-time deployment in low-power or edge lightweight transformers like Wordformer strike a more
environments, highlighting the need for more efficient practical balance, delivering strong performance while
alternatives. remaining deployable across a wider range of systems and
The proposed Wordformer model successfully bridges this constraints.
gap by offering a competitive performance profile with far It is important to note that IndoBERT benefits from large-
fewer parameters and reduced computational cost. Although scale pretraining on Indonesian corpora, providing it with a
it trails IndoBERT slightly in terms of raw accuracy and F1 natural advantage over models that must learn word
score, it dramatically reduces the model size to 96 MB and representations from scratch. This contextual understanding
multiply-adds to just 75 million—roughly 7× smaller and explains the performance gap observed between IndoBERT
85% less compute-intensive. Wordformer consistently and other models like CNN and Wordformer.
outperforms both the CNN-based model and traditional ML
baselines, demonstrating that lightweight transformers can IV. CONCLUSION
deliver strong contextual understanding without the overhead This study presented a comparative evaluation of multiple
of full-scale pretrained models. This makes it a compelling machine learning and deep learning models for the task of
candidate for deployment in production environments where detecting Judi Online spam comments in Bahasa Indonesia.
resource efficiency is critical, such as on-device moderation Through extensive benchmarking, it was found that
tools or serverless processing pipelines. transformer-based models significantly outperform
Further analysis suggests that different model types exhibit traditional ML approaches in both accuracy and
varying strengths depending on the characteristics of the input generalization. Among them, IndoBERT achieved the highest
comment. For instance, IndoBERT demonstrates superior performance but required substantial computational
performance in handling mixed-language comments and non- resources. To address this, we proposed Wordformer, a
standard expressions, likely due to its rich contextual lightweight transformer architecture specifically designed for
embeddings pretrained on diverse Indonesian corpora. efficiency. Wordformer demonstrated competitive
Meanwhile, Wordformer performs reliably across both short performance while maintaining a considerably smaller model
and long inputs, but shows slightly better consistency in size and lower compute cost, positioning it as a practical
moderately lengthy comments that contain enough context for alternative for deployment in constrained environments.
self-attention to operate effectively. CNN, on the other hand, The ablation study provided deeper insights into the
often excels in short comments with strong local patterns such architectural and training components that influence model
as repetitive tokens, emojis, or promotional keywords— performance. It highlighted that even compact models benefit
scenarios where convolutional filters can capture from careful tuning of parameters such as the number of
discriminative n-gram features. Traditional ML models like layers, embedding size, attention heads, and learning rate.
SVM and RF tend to struggle with symbol-heavy or code- Additionally, the choice of optimizer and regularization
mixed input, highlighting their limitations in generalizing to strategy significantly affects the learning dynamics,
informal or obfuscated spam content. particularly in imbalanced classification settings like spam
The ablation study further illustrates the importance of detection.
thoughtful architecture and training configuration. Adding For future research, several directions could further
more transformer layers, increasing embedding and enhance this work. First, expanding the dataset to include
feedforward dimensions, and selecting an appropriate dropout comments from multiple live streams or platforms could
rate (specifically 0.2) all contribute to better performance. The improve model generalization across domains. Second,
learning rate of 1e-4 proved optimal, while alternatives like integrating context-aware features, such as user behavior or
1e-5 or 5e-5 led to underfitting. Notably, the choice of temporal patterns during live streams, may provide richer
optimizer had a marked impact—Adam with class weighting signals for spam detection. Third, exploring knowledge
outperformed both plain Adam and SGD, reinforcing the distillation techniques could help transfer IndoBERT’s
importance of handling class imbalance explicitly in spam strengths into smaller models like Wordformer more
classification tasks. These insights emphasize that even effectively. Lastly, further refining augmentation techniques
within a lightweight architecture, fine-tuning each component for Bahasa Indonesia—potentially leveraging language-
can yield substantial improvements. specific resources or multilingual embeddings—could
Interestingly, traditional ML models such as SVM and enhance robustness against adversarial or obfuscated spam
Random Forest lagged behind, both in accuracy and content.
robustness across metrics like recall and AUC. While they One limitation of this study is the inherent difference in
remain attractive for their minimal resource usage (under 0.1 input representation between models that rely on pretrained
MB in size), their limited ability to capture context or adapt contextual embeddings (such as IndoBERT) and those that do
to noisy, informal language restricts their utility in complex not (such as CNN, Wordformer, SVM, and Random Forest).
tasks like spam detection. Taken together, these findings This gap reflects a real-world trade-off in model selection,
Comparative Analysis of CNN, Transformers, and Traditional ML for Classifying Online Gambling Spam Comments in
Indonesian (Martin Clinton Tosima Manullang, Arkham Zahri Rakhman, Hartanto Tantriawan, Andika Setiawan)

602 e-ISSN: 2548-6861
where practitioners must balance between leveraging classification: A comprehensive review,” ACM Comput. Surv.,
pretrained resources and managing computational efficiency. vol. 54, no. 3, pp. 1–40, Apr. 2022.
In conclusion, this research demonstrates that effective [10] M. A. Hearst, S. T. Dumais, E. Osuna, J. Platt, and B.
Scholkopf, “Support vector machines,” IEEE Intell. Syst., vol.
spam detection in Bahasa Indonesia is feasible with both high-
13, no. 4, pp. 18–28, Jul. 1998.
performance and lightweight models. The Wordformer
[11] L. Breiman, “Random Forests,” Mach. Learn., vol. 45, no. 1,
architecture, in particular, offers a promising path forward for
pp. 5–32, Oct. 2001.
developing real-world solutions that balance accuracy,
[12] J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, “BERT:
interpretability, and efficiency. Pre-training of Deep Bidirectional Transformers for Language
Understanding,” in Proceedings of the 2019 Conference of the
REFERENCES North, Minneapolis, Minnesota, 2019, pp. 4171–4186.
[1] A. Fahrudin et al., “Online gambling addiction: Problems and [13] L. P. Hung and S. Alias, “Beyond sentiment analysis: A review
solutions for policymakers and stakeholders in Indonesia,” J. of recent trends in text based sentiment analysis and emotion
Infrastruct. Pol. Dev., vol. 8, no. 11, p. 9077, Oct. 2024. detection,” J. Adv. Comput. Intell. Intell. Inform., vol. 27, no. 1,
[2] T. N. Dellia Putri Octavia, “Negative Impacts Of Online pp. 84–95, Jan. 2023.
Gambling Reviewed From The Social Economic And [14] L. Gong and R. Ji, “What does a TextCNN learn?,” arXiv
Psychological Perspective In Accordance With Undergoing No. [stat.ML], 18-Jan-2018.
1 Of 2024 On Second Amendment To Undergoing Number11 [15] Z. Hou et al., “C-BDCLSTM: A false emotion recognition
Of 2008 On Information And Transactions,” in International model in micro blogs combined Char-CNN with bidirectional
Conference Restructuring and Transforming Law, 2024. dilated convolutional LSTM,” Appl. Soft Comput., vol. 130, no.
[3] S. Sriyana, “Judi Online: Dampak Sosial, Ekonomi, Dan 109659, p. 109659, Nov. 2022.
Psikologis Di Era Digital,” J SOCIOPOLITICO, Feb. 2025. [16] V. Sanh, L. Debut, J. Chaumond, and T. Wolf, “DistilBERT, a
[4] A. Kosasih and T. Setiady, “Akibat hukum Artis promosikan distilled version of BERT: smaller, faster, cheaper and lighter,”
situs slot Judi online dampak terhadap masyarakat Dan upaya arXiv [cs.CL], 02-Oct-2019.
penanggulangnya,” YUSTISI, vol. 12, no. 1, pp. 67–78, Feb. [17] Z. Lan, M. Chen, S. Goodman, K. Gimpel, P. Sharma, and R.
2025. Soricut, “ALBERT: A lite BERT for self-supervised learning
[5] A. Nurdiansyah and A. S. Kanda, “Bahaya Judi Online : of language representations,” arXiv [cs.CL], 26-Sep-2019.
Dampak Sosial, Ekonomi, Dan Kesehatan,” sscj-amik, vol. 2, [18] X. Jiao et al., “TinyBERT: Distilling BERT for natural
no. 1, pp. 305–310, Jan. 2024. language understanding,” arXiv [cs.CL], 23-Sep-2019.
[6] L. Rafiqah and H. Rasyid, “The Dampak Judi Online terhadap [19] Z. Sun, H. Yu, X. Song, R. Liu, Y. Yang, and D. Zhou,
Kehidupan Sosial Ekonomi Masyarakat,” Al-Mutharahah, vol. “MobileBERT: A compact task-agnostic BERT for resource-
20, no. 2, pp. 282–290, Dec. 2023. limited devices,” arXiv [cs.CL], 06-Apr-2020.
[7] A. A. Hadi, A. Zaky, N. Rizqiananda, and B. Unggaran, [20] Yaemico, “Deteksi Judi Online.” 07-Oct-2024.
“Edukasi Bahaya Judi Online Digital Sebagai Upaya [21] Y. Kim, “Convolutional Neural Networks for Sentence
Pencegahan Dampak Sosial Dan Ekonomi Bagi Masyarakat Classification,” arXiv [cs.CL], 25-Aug-2014.
Komplek Graha Indah 2 Pamulang,” Krepa, vol. 3, no. 12, pp. [22] B. Wilie et al., “IndoNLU: Benchmark and Resources for
61–70, Dec. 2024. Evaluating Indonesian Natural Language Understanding,” in
[8] A. R. Chrismanto, A. K. Sari, and Y. Suyanto, “Critical Proceedings of the 1st Conference of the Asia-Pacific Chapter
evaluation on spam content detection in social media,” Journal of the Association for Computational Linguistics and the 10th
of Theoretical and Applied Information Technology, vol. 100, International Joint Conference on Natural Language
no. 8, pp. 2642–2667, Apr. 2022. Processing, 2020.
[9] S. Minaee, N. Kalchbrenner, E. Cambria, N. Nikzad, M.
Chenaghlu, and J. Gao, “Deep learning--based text
JAIC Vol. 9, No. 3, June 2025: 592 – 602