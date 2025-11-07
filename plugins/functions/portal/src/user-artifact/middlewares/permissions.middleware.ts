import { BadRequestException, DanetMiddleware, ForbiddenException, HttpContext, Injectable, UnauthorizedException } from '@danet/core'
import { JwtPayload, decode } from 'jsonwebtoken'
import { ServiceName } from '../enums/index.ts'
import { GroupService } from '../group/group.service.ts'

@Injectable()
export class PermissionsMiddleware implements DanetMiddleware {
  private readonly permissions = {
    // [ServiceName.DATAFLOW]: '777',
    // [ServiceName.DATAFLOW_REVISION]: '777',
    // [ServiceName.DATAFLOW_RUN]: '777',
    [ServiceName.ANALYSIS_FLOW]: '777',
    // [ServiceName.ANALYSIS_FLOW_REVISION]: '777',
    // [ServiceName.ANALYSIS_FLOW_RUN]: '777',
    [ServiceName.NOTEBOOKS]: '777',
    // [ServiceName.PA_CONFIG]: '777',
    // [ServiceName.CDW_CONFIG]: '777',
    [ServiceName.BOOKMARKS]: '777',
    [ServiceName.CONCEPT_SETS]: '777',
    [ServiceName.ATLAS_COHORT_DEFINITIONS]: '777'
  }

  constructor(private readonly groupsService: GroupService) { }

  async action(context: HttpContext, next: () => Promise<void>) {
    const userIdFromToken = this.extractUserIdFromToken(context)
    const method = context.req.method
    const params = context.req.param()
    const { serviceName, userId } = params

    const permissionLevel = await this.determinePermissionLevel(userIdFromToken, userId)
    const servicePermissions = this.permissions[serviceName]

    if (!servicePermissions) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }

    if (!this.hasPermission(method, servicePermissions[permissionLevel])) {
      throw new ForbiddenException('You are not authorized to perform this action')
    }

    await next()
  }

  private extractUserIdFromToken(context: HttpContext): string {
    const authHeader = context.req.header('authorization')
    if (!authHeader) {
      throw new UnauthorizedException('Unauthorized')
    }

    const token = decode(authHeader.replace(/bearer /i, '')) as JwtPayload
    if (!token || !token.sub) {
      throw new UnauthorizedException('Unauthorized')
    }

    return token.sub
  }

  private async determinePermissionLevel(userIdFromToken: string, userIdFromParam: string): Promise<number> {
    if (userIdFromToken === userIdFromParam) {
      return 0
    }

    const isInGroup = await this.groupsService.userExists(userIdFromToken)
    if (isInGroup) {
      return 1
    }

    return 2
  }

  private hasPermission(method: string, permissionDigit: string): boolean {
    console.log(permissionDigit)
    const permissionValue = parseInt(permissionDigit, 10)

    const permissionMap: Record<string, number> = {
      GET: 4,
      POST: 2,
      PUT: 2,
      DELETE: 2
    }

    const requiredPermission = permissionMap[method]
    return (permissionValue & requiredPermission) === requiredPermission
  }
}