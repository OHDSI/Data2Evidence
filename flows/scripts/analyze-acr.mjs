#!/usr/bin/env zx
// Analyze Azure Container Registry Image Manifests images created before vars.AZ_REG_PRUNE_DAYS
// Output YAML file with analysis images matching env.AZ_REG_KEEP_REGEX to keep and shell script to

const prefix = `acr_${process.env.AZ_REG_REPOSITORY.replace("/", "-")}_manifests`
const timeStamp = (new Date()).toISOString().replace(/[-:]/g, '').split(".")[0]

const acrManifestsDeleteScript = `./private_${prefix}_delete.sh`
const acrManifestsDeleteScriptArchive = `../${prefix}_delete_${timeStamp}.sh`
const acrManifestsOrigJsonFile = `./private_${prefix}_orig.json`
const acrManifestsOrigJsonFileArchive = `../${prefix}_orig_${timeStamp}.json`
const acrManifestsProcessedYmlFile = `./private_${prefix}_analyzed.yml`
const acrManifestsProcessedYmlFileArchive = `../${prefix}_analyzed_${timeStamp}.yml`

const daysAgo = n => {
	let d = new Date();
	d.setDate(d.getDate() - Math.abs(n));
	return d;
};

const includesAny = (arr, values) => values.some(v => arr.includes(v));

const azRegPruneTimestamp = daysAgo(process.env.AZ_REG_PRUNE_DAYS).toISOString()

let manifestsStr = ''
if (fs.existsSync(acrManifestsOrigJsonFile) && (process.env.MJS_DEVELOP == 'true')) {
	echo(`INFO re-using existing ${acrManifestsOrigJsonFile}`)
	manifestsStr = fs.readFileSync(acrManifestsOrigJsonFile, 'utf8');
} else {
	echo(`INFO invoke: az acr manifest list-metadata ...`)
	manifestsStr = await $`az acr manifest list-metadata --only-show-errors --name $AZ_REG_REPOSITORY --registry $AZ_REG_NAME --username "$AZ_REG_USERNAME" --password "$AZ_REG_PASSWORD" --orderby time_asc --query "[?lastUpdateTime < '${azRegPruneTimestamp}']"`
	fs.writeFileSync(acrManifestsOrigJsonFile, manifestsStr.stdout, (err) => {
		throw new Error(`writing file:${acrManifestsOrigJsonFile} failed with ${err}`);
	})
}

// process.exit()

const manifests = JSON.parse(manifestsStr)
const manifestsTagged = manifests.filter(e => e.tags)

const regEx = new RegExp(process.env.AZ_REG_KEEP_REGEX);
const keepTags = manifestsTagged.flatMap(e => e.tags).filter(e => e.match(regEx)).sort()
const keepManifests = manifestsTagged.filter(e => includesAny(e.tags, keepTags))
const keepDigests = keepManifests.flatMap(keepDigest => keepDigest.digest)

echo(`keepTags:\n${YAML.stringify(keepTags)}\n`)
echo(`keepDigests:\n${YAML.stringify(keepDigests)}\n`)

const showMetadatas = await Promise.all(keepManifests.map(async keepManifest => {
	const showMetadata = await $`az acr manifest show-metadata $AZ_REG_FQDN/$AZ_REG_REPOSITORY@${keepManifest.digest} --only-show-errors --username "$AZ_REG_USERNAME" --password "$AZ_REG_PASSWORD"`
	if (typeof showMetadata == 'undefined') {
		throw new Error(`az acr manifest show-metadata command failed`);
	} else {
		return JSON.parse(showMetadata)
	}
}))

const referencedDigests = showMetadatas.flatMap(e => e.references).filter(e => e).map(e => e.digest)

// manifest = manifests[manifests.length - 1] // debug
const analyzedManifests = manifests.map(manifest => {
	if (includesAny(manifest.digest, [...referencedDigests, ...keepDigests])) {
		manifest.keep = true
	} else {
		manifest.keep = false
	}
	const showMetadata = showMetadatas.filter(e => e.digest === manifest.digest)
	if ((typeof showMetadata !== 'undefined') && (showMetadata.length != 0)) {
		if (showMetadata.length != 0) {
			manifest.references = showMetadata[0].references
		}
	}
	return manifest
})

const analyzedManifestsYmlStr = YAML.stringify(analyzedManifests)
fs.writeFileSync(acrManifestsProcessedYmlFile, YAML.stringify(analyzedManifests), (err) => {
	throw new Error(`writing ${acrManifestsProcessedYmlFile} failed with ${err}`);
})
if (process.env.GITHUB_RUN_ID) {
	echo(`analyzedManifestsYmlStr:\n${analyzedManifestsYmlStr}`)
}

let commands = analyzedManifests.filter(m => m.keep == false).map(m => {
	return `az acr repository delete -u $AZ_REG_USERNAME -p $AZ_REG_PASSWORD --name $AZ_REG_NAME --image ${process.env.AZ_REG_REPOSITORY}@${m.digest} --yes # tags:${m.tags}`
})

let commandsStr = ''
if (commands.length > 0) {
	commandsStr = `set -o xtrace\n${commands.slice().join("\n")}`
} else {
	commandsStr = `echo INFO . no deleteable manifests`
}
fs.writeFileSync(acrManifestsDeleteScript, commandsStr, (err) => {
	throw new Error(`writing ${acrManifestsDeleteScript} failed with ${err}`);
})

try {
	fs.copyFileSync(acrManifestsDeleteScript, acrManifestsDeleteScriptArchive)
} catch (err) {
	throw new Error(`FATAL copy ${acrManifestsDeleteScript} ${acrManifestsDeleteScriptArchive} failed with ${err}`);
}

try {
	fs.copyFileSync(acrManifestsOrigJsonFile, acrManifestsOrigJsonFileArchive)
} catch (err) {
	throw new Error(`FATAL copy ${acrManifestsOrigJsonFile} ${acrManifestsOrigJsonFileArchive} failed with ${err}`);
}

try {
	fs.copyFileSync(acrManifestsProcessedYmlFile, acrManifestsProcessedYmlFileArchive)
} catch (err) {
	throw new Error(`FATAL copy ${acrManifestsProcessedYmlFile} ${acrManifestsProcessedYmlFileArchive} failed with ${err}`);
}

// Finalize
if (process.env.GITHUB_RUN_ID) {
	echo(`Commands:\n${commandsStr}\n`)
}

echo(`INFO wrote:`)

echo(`- ${acrManifestsDeleteScript}`)
echo(`- ${acrManifestsOrigJsonFile}`)
echo(`- ${acrManifestsProcessedYmlFile}`)

echo(`- ${acrManifestsDeleteScriptArchive}`)
echo(`- ${acrManifestsOrigJsonFileArchive}`)
echo(`- ${acrManifestsProcessedYmlFileArchive}`)