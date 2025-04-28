import {logger} from "../env.ts"
export async function waitfor(url: string) {
	let f = false;
	while(!f) {
		try {
			await fetch(url)
			f = true
		} catch (e) {
			logger.log(`${url} not reachable. waiting ...`)
			await new Promise(resolve => setTimeout(resolve, 3000)); 
		}
	}
	return "OK";
}