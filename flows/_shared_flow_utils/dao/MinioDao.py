import os
import pandas as pd
from io import BytesIO
from minio import Minio

from prefect.variables import Variable
from prefect.blocks.system import Secret


class MinioDao():
    def __init__(self):
        minio_endpoint = Variable.get("minio_endpoint")
        minio_port = Variable.get("minio_port")
        minio_access_key = Variable.get("minio_access_key")
        minio_region = Variable.get("minio_region")
        minio_ssl = True if Variable.get("minio_ssl") == "true" else False
        
        minio_secret_key = Secret.load("minio-secret-key")

        self.minio_region = minio_region
        self.client = Minio(
            f"{minio_endpoint}:{minio_port}",
            access_key=minio_access_key,
            secret_key=minio_secret_key.get(),
            region=minio_region,
            secure=minio_ssl
        )

    def put_dataframe_as_parquet(self, bucket_name: str, file_name: str, df: pd.DataFrame):
        # Convert dataframe to parquet and buffer
        bytes_data = df.to_parquet()
        buffer = BytesIO(bytes_data)

        if not self.client.bucket_exists(bucket_name):
            self.client.make_bucket(bucket_name, self.minio_region)

        self.client.put_object(bucket_name, file_name,
                            buffer, - 1, part_size=10*1024*1024)