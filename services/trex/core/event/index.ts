const eventManager = new globalThis.EventManager();
// import errsole from 'npm:errsole';
// import ErrsolePostgres from 'npm:errsole-postgres';
// import {env} from "./env.ts"
// try {
// errsole.initialize({
// 	enableDashboard: false,
// 	storage: new ErrsolePostgres({
// 	  host: env.PG__HOST, // Replace with your actual PostgreSQL host
// 	  user: env.PG_USER, // Replace with your actual PostgreSQL user
// 	  password: env.PG_PASSWORD, // Replace with your actual PostgreSQL password
// 	  database: env.PG__DB_NAME, // Replace with the name of your PostgreSQL database
// 	  search_path: "logs"
// 	})
//   });
// } catch (e) {
// 	console.log(errsole);
// 	console.log(e);
// }

console.log('\x1b[90mevent manager running');

for await (const data of eventManager) {
	if (data) {
		//console.log(data)
		switch (data.event_type) {
			case 'Log':
				if (data.event.level === 'Error') {
					console.error(`\x1b[40m\x1b[32m${data.metadata.service_path}\x1b[0m\x1b[31m ${data.event.msg}\x1b[0m`);
				} else {
					console.log(`\x1b[40m\x1b[32m${data.metadata.service_path}\x1b[0m\x1b[34m ${data.event.msg}\x1b[0m`);
					//console.dir(data.event.msg, { depth: Infinity });
				}
				break;
			default:
				console.log(`\x1b[40m\x1b[32m${data.metadata.service_path} User Worker Event:\x1b[0m\x1b[96m ${data.event_type}\x1b[0m`)
				//console.dir(data, { depth: Infinity });
		}
	}
}
