/**
 * Backend functionality for the bookmark functionality
 */
import * as crypto from 'crypto'
import { Connection as connLib } from '@alp/alp-base-utils'
import ConnectionInterface = connLib.ConnectionInterface
import CallBackInterface = connLib.CallBackInterface
import * as utils from '@alp/alp-base-utils'
import {
  BookmarkDto,
  IMaterializedCohort,
  IFormattedBookmark,
  IFormattedcohortDefinition,
  IFrontendBookmark,
  IAtlasCohortDefinition,
  IFormattedAtlasCohortDefinition,
} from '../types'
import { PortalAPI } from '../api/PortalAPI'
import { AnalyticsSvcAPI } from '../api/AnalyticsAPI'

/**
 * This method was created so it can be spied on during testing (without affecting utils)
 */
export function _createGuid() {
  return utils.createGuid()
}

/**
 * Generate a bookmarkid based on bookmark name and some random numbers. Then just get last 40 characters as this is the db column limit
 */
export function createBookmarkId(bookmarkName: string) {
  return `${bookmarkName.replace(/[^a-zA-Z0-9]/g, '')}_${crypto.randomBytes(4).toString('hex')}`.substr(-40)
}
/**
 * Generate an DTO for creating a new bookmark entity
 */
export function createBookmarkDto(
  bookmarkName: string,
  bookmark: string,
  paConfigId: string,
  cdmConfigId: string,
  cdmConfigVersion: number,
  shareBookmark: boolean,
  userName: string
): BookmarkDto {
  return {
    id: createBookmarkId(bookmarkName),
    bookmark_name: bookmarkName,
    bookmark: bookmark,
    type: null,
    view_name: null,
    modified: new Date().toISOString(),
    version: 1,
    pa_config_id: paConfigId,
    cdm_config_id: cdmConfigId,
    cdm_config_version: cdmConfigVersion,
    user_id: userName,
    shared: shareBookmark,
  }
}

export function formatUserArtifactData(paConfigId: string, data: any[], userName: string): IFormattedBookmark[] {
  return data
    .filter(
      row =>
        row.pa_config_id === paConfigId &&
        (row.user_id === userName || (userName && row.user_id !== userName && row.shared))
    )
    .map(row => ({
      bmkId: row.id,
      bookmarkname: row.bookmark_name,
      bookmark: row.bookmark,
      viewname: row.view_name || null,
      modified: row.modified,
      version: row.version,
      user_id: row.user_id,
      shared: row.shared,
      cohortDefinitionId: row.cohortDefinitionId,
    }))
}

/**
 * Load all bookmarks for a given user id.
 *
 * @param {string}
 *            userid userid
 * @param {string}
 *            token user token
 * @param {object}
 *            dbConnection DB connection to be used
 * @returns {object[]} Updated bookmaks, ordered by bookmark name
 */

export async function _loadAllBookmarks(
  userName,
  token,
  paConfigId,
  datasetId: string,
  connection: ConnectionInterface,
  callback: CallBackInterface
) {
  try {
    const portalAPI = new PortalAPI(token)

    // Get and format bookmarks
    const bookmarks = await portalAPI.getBookmarks(datasetId)
    const formattedBookmarks = formatUserArtifactData(paConfigId, bookmarks, userName)

    // Get and format atlas cohort definitions
    const atlasCohortDefinitions = await portalAPI.getAtlasCohortDefinitions(datasetId)

    const formattedAtlasCohortDefinitions = atlasCohortDefinitions.map(atlasCohortDefinition =>
      _formatAtlasCohortDefinition(atlasCohortDefinition)
    )

    // Get and format materialized cohorts
    const analyticsSvcAPI = new AnalyticsSvcAPI(token)
    const cohortDefinitions = await analyticsSvcAPI.getAllCohorts(datasetId)
    const formattedCohortDefinitions = cohortDefinitions.map(cohort => _formatCohortDefinition(cohort))

    const returnValue: IFrontendBookmark = {
      schemaName: connection.schemaName,
      bookmarks: formattedBookmarks,
      materializedCohorts: formattedCohortDefinitions,
      atlasCohortDefinitions: formattedAtlasCohortDefinitions,
    }
    callback(null, _convertBookmarkIFR(returnValue))
  } catch (error) {
    console.error(error)
    callback(error, null)
  }
}

/**
 * Loads a single bookmark for a given user id and bookmark id.
 *
 * @param {string}
 *            bookmarkId Bookmark Id
 * @param {string}
 *            userId userid
 * @param {object}
 *            dbConnection DB connection to be used
 * @returns {object[]} Updated bookmakrs, ordered by bookmark name
 */
export async function loadSingleBookmark(
  userName,
  bookmarkId,
  paConfigId,
  token,
  datasetId,
  callback?: CallBackInterface
) {
  try {
    const portalAPI = new PortalAPI(token)
    const result = await portalAPI.getBookmarkById(bookmarkId, datasetId)
    const formattedRows = formatUserArtifactData(paConfigId, result, userName)
    const returnValue = _convertBookmarkIFR({
      bookmarks: formattedRows,
    })
    if (callback) {
      callback(null, _convertBookmarkIFR(returnValue))
    } else {
      return returnValue
    }
  } catch (error) {
    console.error(error)
    callback(error, null)
  }
}

/**
 * Insert a bookmark.
 *
 * @param {string}
 *            bookname name
 * @param {string}
 *            bookmark contents
 * @param {string}
 *            user Id
 * @param {string}
 *            last modified user name
 * @param {string}
 *            table Name of table to use
 * @param {object}
 *            dbConnection DB connection to be used
 */
export async function _insertBookmark(
  bookmarkName,
  bookmark,
  userName,
  paConfigId,
  cdmConfigId,
  cdmConfigVersion,
  shareBookmark,
  token,
  datasetId,
  callback: CallBackInterface
) {
  try {
    const bookmarkDto = createBookmarkDto(
      bookmarkName,
      bookmark,
      paConfigId,
      cdmConfigId,
      cdmConfigVersion,
      shareBookmark,
      userName
    )
    const portalAPI = new PortalAPI(token)
    const result = await portalAPI.createBookmark({ serviceArtifact: bookmarkDto }, datasetId)
    callback(null, result)
  } catch (error) {
    console.error(error)
    callback(error, null)
  }
}

/**
 * Delete an existing bookmark.
 *
 * @param {string}
 *            bookmarkId Bookmark ID
 * @param {string}
 *            user ID
 * @param {string}
 *            pa config Id
 * @param {string}
 *            table Name of table to use
 * @param {object}
 *            dbConnection DB connection to be used
 */
export async function _deleteBookmark(bookmarkId, userId, datasetId, token, callback: CallBackInterface) {
  if (!bookmarkId || !userId || bookmarkId === '' || userId === '') {
    callback(null, null)
  }
  try {
    const portalAPI = new PortalAPI(token)
    const bookmarkResult = await portalAPI.getBookmarkById(bookmarkId, datasetId)
    const currentBookmark = bookmarkResult[0]

    if (!currentBookmark) {
      throw `Unable to find bookmark with id:${bookmarkId}, aborting delete bookmark`
    }

    // If bookmark has a cohortDefinitionId, delete cohort before deleting bookmark
    if (currentBookmark.cohortDefinitionId) {
      const analyticsSvcAPI = new AnalyticsSvcAPI(token)
      await analyticsSvcAPI.deleteCohort(datasetId, currentBookmark.cohortDefinitionId)
    }

    const result = await portalAPI.deleteBookmark(bookmarkId, datasetId)

    callback(null, result)
  } catch (error) {
    console.error(error)
    callback(error, null)
  }
}

/**
 * Rename an existing bookmark.
 *
 * @param {string}
 *            bookmarkId Bookmark ID
 * @param {string}
 *            newBookmarkName New Bookmark Name
 * @param {string}
 *            user Id
 * @param {string}
 *            pa config Id
 * @param {string}
 *            cdm config Id
 * @param {string}
 *            cdm config version
 * @param {string}
 *            table Name of table to use
 * @param {object}
 *            dbConnection DB connection to be used
 *  @param {object}
 *            callback
 */
export async function _renameBookmark(
  bookmarkId,
  newBookmarkName,
  paConfigId,
  cdmConfigId,
  cdmConfigVersion,
  datasetId,
  token,
  callback: CallBackInterface
) {
  try {
    const updateBookmarkDto = {
      id: bookmarkId,
      serviceArtifact: {
        id: bookmarkId,
        bookmark_name: newBookmarkName,
        pa_config_id: paConfigId,
        cdm_config_id: cdmConfigId,
        cdm_config_version: cdmConfigVersion,
        modified: new Date().toISOString(),
      },
    }
    const portalAPI = new PortalAPI(token)
    const result = await portalAPI.updateBookmark(updateBookmarkDto, datasetId)

    // Additionally update corresponding cohort definition name if bookmark has a cohortDefinitionId
    const updatedBookmark = result.artifacts.bookmarks.find(bookmark => bookmark.id === bookmarkId)
    if (updatedBookmark.cohortDefinitionId) {
      const analyticsSvcAPI = new AnalyticsSvcAPI(token)
      await analyticsSvcAPI.renameCohortDefinition(datasetId, updatedBookmark.cohortDefinitionId, newBookmarkName)
    }

    callback(null, result)
  } catch (error) {
    console.error(error)
    callback(error, null)
  }
}

/**
 * Update an existing bookmark.
 *
 * @param {string}
 *            bookmarkId Bookmark ID
 * @param {string}
 *            bookmark New Bookmark Data
 * @param {string}
 *            user Id
 * @param {string}
 *            pa config Id
 * @param {string}
 *            cdm config Id
 * @param {string}
 *            cdm config version
 * * @param {boolean}
 *            defines whethers the bookmark is shared between users
 * @param {string}
 *            table Name of table to use
 * @param {object}
 *            dbConnection DB connection to be used
 * @param {object}
 *            callback
 */
export async function _updateBookmark( //TODO remove user input
  bookmarkId,
  bookmark,
  paConfigId,
  cdmConfigId,
  cdmConfigVersion,
  shareBookmark,
  token,
  datasetId,
  callback: CallBackInterface
) {
  try {
    const portalAPI = new PortalAPI(token)
    const bookmarkResult = await portalAPI.getBookmarkById(bookmarkId, datasetId)
    const currentBookmark = bookmarkResult[0]

    if (!currentBookmark) {
      throw `Unable to find bookmark with id:${bookmarkId}, aborting update bookmark`
    }

    const updateBookmarkDto = {
      id: bookmarkId,
      serviceArtifact: {
        id: bookmarkId,
        bookmark: bookmark,
        pa_config_id: paConfigId,
        cdm_config_id: cdmConfigId,
        cdm_config_version: cdmConfigVersion,
        modified: new Date().toISOString(),
        shared: shareBookmark,
        version: currentBookmark.version + 1,
      },
    }

    const result = await portalAPI.updateBookmark(updateBookmarkDto, datasetId)
    callback(null, result)
  } catch (error) {
    console.error(error)
    callback(error, null)
  }
}

/**
 * Returns a list of bookmarks with supplied bookmark id's
 *
 * @param {{ bookmarkIds: string[]; table: string; user: string, configConnection: ConnectionInterface }}
 *  bookmarkIds - list of bookmark ids
 *  table - bookmark table name
 *  userId - userid
 *  configConnection - connection object
 * @returns array of bookmarks
 */
export async function loadBookmarks({
  userName,
  bookmarkIds,
  paConfigId,
  datasetId,
  token,
  callback,
}: {
  userName: string
  bookmarkIds: string[]
  paConfigId: string
  datasetId: string
  token: string
  callback: CallBackInterface
}) {
  const list = await Promise.all(
    bookmarkIds.map(bookmarkid =>
      loadSingleBookmark(userName, bookmarkid, paConfigId, token, datasetId).then(result => result.bookmarks[0])
    )
  )
    .then(data => {
      callback(null, data)
    })
    .catch(err => {
      callback(err, null)
    })
  return list
}

/**
 * Process data passed to the bookmark REST-service.
 *
 * @param {object}
 *            requestParameters Parameters passed in request to REST-service
 * @param {string}
 *            user User id
 * @param {string}
 *            table Name of table to use
 * @param {object}
 *            dbConnection DB connection to be used
 * @returns {object} Always return new Bookmark list to keep the frontend
 *          up-to-date.
 */
export async function queryBookmarks(
  requestParameters,
  userName,
  token,
  configConnection: ConnectionInterface,
  callback: CallBackInterface
) {
  try {
    let cmd: string = requestParameters.cmd
    let bookmark: string = requestParameters.bookmark
    let bookmarkId: string = requestParameters.bmkId
    let bookmarkIds: string[] = requestParameters.bmkIds
    let viewName: string = requestParameters.viewName
    let paConfigId: string = requestParameters.paConfigId
    let cdmConfigId: string = requestParameters.cdmConfigId
    let cdmConfigVersion: string = requestParameters.cdmConfigVersion
    let shareBookmark: boolean = requestParameters.shareBookmark
    let datasetId: string = requestParameters.datasetId

    let cb = (err, result) => {
      if (err) {
        callback(err, null)
        return
      }
      callback(err, `success`)
    }

    switch (cmd) {
      case 'insert':
        // 'this' has to be used so we can use spyON in the tests
        _insertBookmark(
          requestParameters.bookmarkname,
          bookmark,
          userName,
          paConfigId,
          cdmConfigId,
          cdmConfigVersion,
          shareBookmark,
          token,
          datasetId,
          cb
        )
        break
      case 'delete':
        _deleteBookmark(bookmarkId, userName, datasetId, token, cb)
        break
      case 'update':
        _updateBookmark(
          bookmarkId,
          bookmark,
          paConfigId,
          cdmConfigId,
          cdmConfigVersion,
          shareBookmark,
          token,
          datasetId,
          cb
        )
        break
      case 'rename':
        _renameBookmark(
          bookmarkId,
          requestParameters.newName,
          paConfigId,
          cdmConfigId,
          cdmConfigVersion,
          datasetId,
          token,
          cb
        )
        break
      case 'loadSingle':
        loadSingleBookmark(userName, bookmarkId, paConfigId, token, datasetId, callback)
        break
      case 'loadByIDs':
        loadBookmarks({
          userName,
          bookmarkIds,
          paConfigId,
          datasetId,
          token,
          callback,
        })
        break
      case 'loadAll':
        await _loadAllBookmarks(userName, token, paConfigId, datasetId, configConnection, callback)
        break
      default:
        throw new Error('unknown command: ' + cmd)
    }
  } catch (error) {
    callback(error, null)
  }
}

/**
 * If bookmark IFR is in Uint8Array format then converts it to string.
 * @param   {Object} result - queried result
 * @returns {Object} - updated result
 */
function _convertBookmarkIFR(result) {
  if (result && result.bookmarks && result.bookmarks.length > 0) {
    result.bookmarks.forEach(el => {
      if (ArrayBuffer.isView(el.bookmark)) {
        el.bookmark = utils.toString(el.bookmark)
      } else if (ArrayBuffer.isView(el.cohortDefinition)) {
        el.cohortDefinition = utils.toString(el.cohortDefinition)
      }
    })
  }
  return result
}

const _formatCohortDefinition = (cohortDefinition: IMaterializedCohort): IFormattedcohortDefinition => ({
  id: cohortDefinition.id,
  patientCount: cohortDefinition.patientIds.length,
  cohortDefinitionName: cohortDefinition.name,
  createdOn: cohortDefinition.creationTimestamp,
})

const _formatAtlasCohortDefinition = (
  atlasCohortDefinition: IAtlasCohortDefinition
): IFormattedAtlasCohortDefinition => ({
  id: atlasCohortDefinition.id,
  name: atlasCohortDefinition.name,
  username: atlasCohortDefinition.createdBy,
  createdOn: new Date(atlasCohortDefinition.createdDate).toISOString(),
  updatedOn: new Date(atlasCohortDefinition.modifiedDate).toISOString(),

  // Only add key cohortDefinitionId if materializedCohortDefinitionIds array is not empty. If array is not empty, get last value of array, which is the latest materialized cohort
  ...(atlasCohortDefinition.materializedCohortDefinitionIds.length > 0 && {
    cohortDefinitionId:
      atlasCohortDefinition.materializedCohortDefinitionIds[
        atlasCohortDefinition.materializedCohortDefinitionIds.length - 1
      ],
  }),
})
