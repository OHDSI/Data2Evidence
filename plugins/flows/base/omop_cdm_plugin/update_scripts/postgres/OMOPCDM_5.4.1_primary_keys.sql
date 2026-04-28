--postgresql CDM Primary Key Constraints for OMOP Common Data Model 5.4
ALTER TABLE episode  ADD CONSTRAINT xpk_episode PRIMARY KEY (episode_id);
