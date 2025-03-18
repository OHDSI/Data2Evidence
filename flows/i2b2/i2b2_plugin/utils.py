import os
from prefect_shell import ShellOperation

def get_version_from_tag(tag: str) -> str:
    return tag[1:4].replace(".", "-")

def path_to_ant(tag: str) -> str:
    return f"/app/i2b2-data-{tag[1:]}/edu.harvard.i2b2.data/Release_{get_version_from_tag(tag)}"

def check_table_creation(dbdao):
    '''
    Check if tables were created
    '''
    table_list = dbdao.get_table_names()
    if table_list == []:
        raise Exception(f"Failed to create i2b2 tables. Schema is empty.")

def download_source_code(tag_name: str):
    ShellOperation(
        commands=[
            f"wget https://github.com/i2b2/i2b2-data/archive/refs/tags/{tag_name}.tar.gz",
        ],
        stream_output=False).run()
    
def unzip_source_code(tag_name: str):
    ShellOperation(
        commands=[         
            f"tar -xzf {tag_name}.tar.gz",
        ],
        stream_output=True).run()

# Used to setup apache ant during flow run
# def setup_apache_ant(tag_name: str):
#     cwd = os.getcwd()
#     ant_bin_dir = os.path.join(cwd, f"{path_to_ant(tag_name)}/apache-ant")
    
#     # Set ant_home environment variable
#     os.environ["ANT_HOME"] = ant_bin_dir
    
#     ShellOperation(
#         commands=[         
#             f'ln -sfn {ant_bin_dir} /opt/ant',
#             f'ln -sfn /opt/ant/bin/ant /usr/bin/ant',
#             'ant -version'
#         ]).run()