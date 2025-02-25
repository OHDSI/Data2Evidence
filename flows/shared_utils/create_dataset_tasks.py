from __future__ import annotations

import os
from typing import TYPE_CHECKING

from prefect import task
from prefect.logging import get_run_logger
from prefect.logging.loggers import task_run_logger
from prefect.server.schemas.states import StateType

from shared_utils.liquibase import Liquibase
from shared_utils.types import SupportedDatabaseDialects


if TYPE_CHECKING:
    from shared_utils.dao.daobase import DaoBase



def get_plugin_classpath(flow_name: str) -> str:
    return f'{os.getcwd()}/flows/{flow_name}/'


@task(log_prints=True)
def create_schema_task(dbdao: DaoBase):
    schema_exists = dbdao.check_schema_exists()
    if schema_exists is False:
        dbdao.create_schema()
    else:
        error_msg = f"Schema '{dbdao.schema_name}' already exists in database '{dbdao.database_code}'"
        get_run_logger().error(error_msg)
        raise Exception(error_msg)


@task(log_prints=True)
def run_liquibase_update_task(**kwargs):
    liquibase = Liquibase(**kwargs)
    liquibase.update_schema()



    
@task(log_prints=True)
def enable_and_create_audit_policies_task(dbdao: DaoBase):
    logger = get_run_logger()
    enable_audit_policies = dbdao.tenant_configs.enableAuditPolicies
    if enable_audit_policies:
        dbdao.enable_auditing()
        dbdao.create_system_audit_policy()
        dbdao.create_schema_audit_policy()
    else:
        logger.info("Skipping Alteration of system configuration")
        logger.info("Skipping creation of Audit policy for system configuration")
        logger.info(f"Skipping creation of new audit policy for {dbdao.schema_name}")


@task(log_prints=True)
def create_and_assign_roles_task(dbdao: DaoBase):
    logger = get_run_logger()
    
    # Check if schema read role exists
    match dbdao.dialect:
        case SupportedDatabaseDialects.HANA:
            schema_read_role = f"{dbdao.schema_name}_READ_ROLE"
        case SupportedDatabaseDialects.POSTGRES:
            schema_read_role = f"{dbdao.schema_name}_read_role"

    schema_read_role_exists = dbdao.check_role_exists(schema_read_role)
    if schema_read_role_exists:
        logger.info(f"'{schema_read_role}' role already exists")
    else:
        logger.info(f"'{schema_read_role}' does not exist")
        dbdao.create_read_role(schema_read_role)
        
    # grant schema read role read privileges to schema read role
    logger.info(f"Granting read privileges to '{schema_read_role}'")
    dbdao.grant_read_privileges(schema_read_role)

    # Check if read user exists
    read_user_exists = dbdao.check_user_exists(dbdao.read_user)
    if read_user_exists:
        logger.info(f"'{dbdao.read_user}' user already exists")
    else:
        logger.info(f"'{dbdao.read_user}' user does not exist")
        logger.info(f"Creating user '{dbdao.read_user}'..")
        dbdao.create_user(dbdao.read_user)

    # Check if read role exists
    read_role_exists = dbdao.check_role_exists(dbdao.read_role)
    if read_role_exists:
        logger.info(f"'{dbdao.read_role}' role already exists")
    else:
        logger.info(f"'{dbdao.read_role}' role does not exist")
        logger.info(
            f"Creating '{dbdao.read_role}' role and assigning to '{dbdao.read_user}' user")
        dbdao.create_and_assign_role(dbdao.read_user, dbdao.read_role)

    # Grant read role read privileges
    logger.info(f"Granting read privileges to '{dbdao.read_role}' role")
    dbdao.grant_read_privileges(dbdao.read_role)


def drop_schema_hook(task, task_run, state, dbdao: DaoBase):
    logger = task_run_logger(task_run, task)
    logger.info(
        f"Dropping schema '{dbdao.database_code}.{dbdao.schema_name}'..")
    try:
        drop_schema = dbdao.drop_schema()
    except Exception as e:
        logger.info(
            f"Failed to drop schema {dbdao.database_code}.{dbdao.schema_name}")
    else:
        logger.info(
            f"Successfully dropped schema '{dbdao.database_code}.{dbdao.schema_name}'")