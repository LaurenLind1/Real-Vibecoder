/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was safely manually generated to fix the routing tree sync issue.

import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'

const IndexRoute = IndexImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
  }
}

export const routeTree = rootRoute._addFileChildren({ IndexRoute })
