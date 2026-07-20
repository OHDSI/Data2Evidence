--liquibase formatted sql
--changeset alp:V1.0.0.0.1__create_waveform_indices


CREATE INDEX idx_waveform_occ_person_id ON waveform_occurrence (person_id);
CREATE INDEX idx_waveform_occ_visit_id ON waveform_occurrence (visit_occurrence_id);
CREATE INDEX idx_waveform_occ_concept_id ON waveform_occurrence (waveform_occurrence_concept_id);

CREATE INDEX idx_waveform_reg_occ_id ON waveform_registry (waveform_occurrence_id);
CREATE INDEX idx_waveform_reg_person_id ON waveform_registry (person_id);

CREATE INDEX idx_waveform_chnl_reg_id ON waveform_channel_metadata (waveform_registry_id);
CREATE INDEX idx_waveform_chnl_concept_id ON waveform_channel_metadata (channel_concept_id);

CREATE INDEX idx_waveform_feat_occ_id ON waveform_feature (waveform_occurrence_id);
CREATE INDEX idx_waveform_feat_reg_id ON waveform_feature (waveform_registry_id);
CREATE INDEX idx_waveform_feat_chnl_id ON waveform_feature (waveform_channel_metadata_id);


--rollback DROP INDEX idx_waveform_occ_person_id;
--rollback DROP INDEX idx_waveform_occ_visit_id;
--rollback DROP INDEX idx_waveform_occ_concept_id;
--rollback DROP INDEX idx_waveform_reg_occ_id;
--rollback DROP INDEX idx_waveform_reg_person_id;
--rollback DROP INDEX idx_waveform_chnl_reg_id;
--rollback DROP INDEX idx_waveform_chnl_concept_id;
--rollback DROP INDEX idx_waveform_feat_occ_id;
--rollback DROP INDEX idx_waveform_feat_reg_id;
--rollback DROP INDEX idx_waveform_feat_chnl_id;
