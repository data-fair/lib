// import { httpError } from '@data-fair/lib/http-errors.js'
// import session from '@data-fair/lib/express/session.js'

// Util functions shared accross the main find (GET on collection) endpoints

// /**
//  * @param {import('express').Request} req
//  * @returns {Promise<import('mongodb').Filter<any>>}
//  */
// export const mongoQuery = async (req) => {
//   const query = {}
//   if (req.query.q && typeof req.query.q === 'string') query.$text = { $search: req.query.q }

//   /*
//   Object.keys(fieldsMap).filter(name => req.query[name] !== undefined).forEach(name => {
//     query[fieldsMap[name]] = { $in: req.query[name].split(',') }
//   })
//   */

//   const sessionState = await session.reqAuthenticated(req)

//   const showAll = req.query.showAll === 'true'
//   if (showAll && !sessionState.user.adminMode) {
//     throw httpError(400, 'Only super admins can override owner filter with showAll parameter')
//   }
//   if (!showAll) {
//     query['owner.type'] = sessionState.account.type
//     query['owner.id'] = sessionState.account.id
//   }
//   return query
// }

import type { Sort } from 'mongodb'
import type { Request } from 'express'

export function mongoSort (sortParam: any): Sort {
  /** @type {Record<string, import('mongodb').SortDirection>} */
  const sort = {}

  if (typeof sortParam !== 'string') return sort

  if (!sortParam) return sort
  Object.assign(sort, ...sortParam.split(',').map(s => {
    const toks = s.split(':')
    return {
      [toks[0]]: Number(toks[1])
    }
  }))
  return sort
}

export function mongoPagination (query: Request['query'], defaultSize = 10) {
  let size = defaultSize
  if (query && query.size && typeof query.size === 'string' && !isNaN(parseInt(query.size))) {
    size = parseInt(query.size)
  }

  let skip = 0
  if (query && query.skip && typeof query.skip === 'string' && !isNaN(parseInt(query.skip))) {
    skip = parseInt(query.skip)
  } else if (query && query.page && typeof query.page === 'string' && !isNaN(parseInt(query.page))) {
    skip = (parseInt(query.page) - 1) * size
  }

  return { skip, size }
}

export function mongoProjection (selectParam: any, exclude: string[] = []): Record<string, 0 | 1> {
  const select: Record<string, 0 | 1> = { }

  if (typeof selectParam !== 'string') return select

  if (!selectParam) {
    exclude.forEach(e => {
      select[e] = 0
    })
  } else {
    selectParam.split(',').forEach(s => {
      select[s] = 1
    })
    Object.assign(select, { owner: 1 })
    exclude.forEach(e => {
      delete select[e]
    })
  }
  return select
}
