    with duckdb.connect(duckdb_file_path) as conn:
        conn.load_extension(vss_extension_path)
        if recreate:
            conn.execute("DROP TABLE IF EXISTS gte_embeddings")
        elif DBDao.check_table_exists():
            raise "Embedding table exists"
        conn.execute(f"CREATE TABLE {duckdb_database_name}.gte_embeddings (concept_id int, vec FLOAT[384]);")

        concept = conn.execute('SELECT concept_id, concept_name FROM concept').fetchnumpy()
        logger.info("Start embedding")
        length = len(concept['concept_name'])
        for i in range(0, length, 100):
            concept_name = concept['concept_name'][i:i+100].tolist()
            concept_id = concept['concept_id'][i:i+100]
            embeddings = embedding_concept_table(concept_name).tolist()
            rst = pd.DataFrame({'concept_id':concept_id, 'gte-small_384': embeddings})
            conn.execute(f"""INSERT INTO gte_embeddings SELECT concept_id, "gte-small_384" FROM rst""")
            percent = (i+1)/(int(length / 100) + (length % 100 > 0)) * 100
            logger.info(f'{round(percent,2)} % completed')