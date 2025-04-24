FROM python:3.10-slim

ARG BUILD_TYPE
ARG USER=docker
ENV USER=${USER}
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID ${USER}
RUN useradd -m -d /home/${USER} -s /bin/bash -g ${USER} -u ${UID} ${USER}

WORKDIR /app

RUN apt-get update && apt-get install libpq5 libpq-dev curl gcc g++ unzip -y --no-install-recommends && apt-get clean
COPY --chown=docker:docker ./_shared_flow_utils/postgresql-42.3.1.jar ./inst/drivers/
COPY --chown=docker:docker  ./__init__.py .

# Download NLP 2GB linkers
RUN mkdir -p /home/docker/.scispacy/datasets
RUN chown -R docker:docker /home/docker/.scispacy/datasets

RUN curl -o /home/docker/.scispacy/datasets/2b79923846fb52e62d686f2db846392575c8eb5b732d9d26cd3ca9378c622d40.87bd52d0f0ee055c1e455ef54ba45149d188552f07991b765da256a1b512ca0b.tfidf_vectors_sparse.npz https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/linkers/2023-04-23/umls/tfidf_vectors_sparse.npz \
	&& curl -o /home/docker/.scispacy/datasets/7e8e091ec80370b87b1652f461eae9d926e543a403a69c1f0968f71157322c25.6d801a1e14867953e36258b0e19a23723ae84b0abd2a723bdd3574c3e0c873b4.nmslib_index.bin https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/linkers/2023-04-23/umls/nmslib_index.bin \
	&& curl -o /home/docker/.scispacy/datasets/37bc06bb7ce30de7251db5f5cbac788998e33b3984410caed2d0083187e01d38.f0994c1b61cc70d0eb96dea4947dddcb37460fb5ae60975013711228c8fe3fba.tfidf_vectorizer.joblib https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/linkers/2023-04-23/umls/tfidf_vectorizer.joblib \
	&& curl -o /home/docker/.scispacy/datasets/6238f505f56aca33290aab44097f67dd1b88880e3be6d6dcce65e56e9255b7d4.d7f77b1629001b40f1b1bc951f3a890ff2d516fb8fbae3111b236b31b33d6dcf.concept_aliases.json https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/linkers/2023-04-23/umls/concept_aliases.json \
	&& curl -o /home/docker/.scispacy/datasets/d5e593bc2d8adeee7754be423cd64f5d331ebf26272074a2575616be55697632.0660f30a60ad00fffd8bbf084a18eb3f462fd192ac5563bf50940fc32a850a3c.umls_2022_ab_cat0129.jsonl https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/kbs/2023-04-23/umls_2022_ab_cat0129.jsonl \
	&& curl -o /home/docker/.scispacy/datasets/21a1012c532c3a431d60895c509f5b4d45b0f8966c4178b892190a302b21836f.330707f4efe774134872b9f77f0e3208c1d30f50800b3b39a6b8ec21d9adf1b7.umls_semantic_type_tree.tsv https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/data/umls_semantic_type_tree.tsv \
	&& curl -o /home/docker/.scispacy/datasets/68e7f1197d5852698808a5f9d694026c210e4b93a7e496dea608a46fff914774.e9a1075d5c32b5e7a180b60a96b15fc072ea714b95dd458047a48ccf2bb065be.tfidf_vectors_sparse.npz https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/linkers/2023-04-23/rxnorm/tfidf_vectors_sparse.npz \
	&& curl -o /home/docker/.scispacy/datasets/3742ff1d61c637ce7dc935674fa4199810af16978f9a10088d71d37bba16203a.8f798c6f751125a0d68f8b4e82ecfba4fd37bfb2a447d61fba584e208e6af9d3.nmslib_index.bin https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/linkers/2023-04-23/rxnorm/nmslib_index.bin \
	&& curl -o /home/docker/.scispacy/datasets/e6db3b626658739bfbd89a4695141db556c21cb8b915a8e7de00650992529158.2bf384392e4cece70fca03154737daf5a4e8a43fcab3fe83bb8e5d3467ccaff1.tfidf_vectorizer.joblib https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/linkers/2023-04-23/rxnorm/tfidf_vectorizer.joblib \
	&& curl -o /home/docker/.scispacy/datasets/54a3afac2f157748a3326a13e59ffe165fcc40ce0cceab6dc47303965dc3c0ed.71746c536649e7ba8a47b6cb7a3a7c8e0c447e022bdf819e69fbb1de9276d411.concept_aliases.json https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/linkers/2023-04-23/rxnorm/concept_aliases.json \
	&& curl -o /home/docker/.scispacy/datasets/afd8034c6b1a9b6e9eb94a5688ab043023fb450ddf36c88b9f78efa21c5b2d0a.7afae38a116c40277e6052ddcfcd0013fb8136a6d4f96d965ccc7689e8543712.umls_rxnorm_2022.jsonl https://ai2-s2-scispacy.s3-us-west-2.amazonaws.com/data/kbs/2023-04-23/umls_rxnorm_2022.jsonl

# Downgrade "pip" for downloading "en_core_med7_trf model", and upgrade it afterwards.
RUN python -m pip install --upgrade "pip<24"
RUN pip install --no-deps https://huggingface.co/kormilitzin/en_core_med7_trf/resolve/main/en_core_med7_trf-any-py3-none-any.whl
RUN pip install --no-deps https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.1/en_ner_bc5cdr_md-0.5.1.tar.gz
RUN pip3 install --upgrade pip

COPY --chown=docker:docker --chmod=711 ./_shared_flow_utils _shared_flow_utils
COPY --chown=docker:docker --chmod=711 ./nlp/requirements_NLP.txt .
ENV RUN_TYPE=$BUILD_TYPE
RUN if [ $BUILD_TYPE = 'OSS' ]; then sed -i '/sqlalchemy-hana/d' requirements*.txt; fi
RUN pip install -r requirements_NLP.txt

COPY --chown=docker:docker --chmod=711 ./nlp/ner_extract_plugin flows/ner_extract_plugin
RUN mkdir -p flows/ner_extract_plugin/external/
RUN curl -o flows/ner_extract_plugin/external/CUItoOHDSIv1.zip https://raw.githubusercontent.com/jmbanda/OHDSIconceptid2cui/refs/heads/master/CUItoOHDSIv1.zip
RUN unzip -o flows/ner_extract_plugin/external/CUItoOHDSIv1.zip -d flows/ner_extract_plugin/external
RUN rm flows/ner_extract_plugin/external/CUItoOHDSIv1.zip

USER docker