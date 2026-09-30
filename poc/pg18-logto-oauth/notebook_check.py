"""Run inside a PoC notebook container: what does this user's token open?
    docker cp notebook_check.py jupyter-alice:/tmp/ && docker exec jupyter-alice python /tmp/notebook_check.py
"""
import pg_oauth
c = pg_oauth.claims(); print('token aud', c['aud'], '| scope', c['scope'])
conn = pg_oauth.connect()
print('connected as', conn.execute('select system_user, current_user').fetchone())
print('select allowed.demo ->', conn.execute('select * from allowed.demo').fetchall())
for sql in ('drop table allowed.demo', 'select * from secret.demo', 'select * from schema_b.demo'):
    try: conn.execute(sql); print('UNEXPECTED OK:', sql)
    except Exception as e: print('denied:', sql, '->', str(e).splitlines()[0])
try: pg_oauth.connect(role='jupyter_test_b'); print('UNEXPECTED: got jupyter_test_b')
except Exception as e: print('as jupyter_test_b -> refused:', str(e).splitlines()[0][-60:])
