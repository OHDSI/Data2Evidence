import { BadRequestException, Body, Controller, Delete, Get, Middleware, Param, Post, Put, Req } from '@danet/core'
import { ServiceName } from './enums/index.ts'
import { PermissionsMiddleware } from './middlewares/permissions.middleware.ts'
import { UserArtifactService } from './user-artifact.service.ts'
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";


// @Middleware(PermissionsMiddleware)
@Middleware(RequestContextMiddleware)
@Controller("system-portal/user-artifact")
export class UserArtifactController {
  constructor(private readonly userArtifactService: UserArtifactService) { }

  @Get(':serviceName/list')
  getAllServiceArtifacts(@Param('serviceName') serviceName: ServiceName) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.getAllServiceArtifacts(serviceName)
  }

  @Get(':userId/:serviceName/list')
  getUserServiceArtifact(
    @Param('userId') userId: string,
    @Param('serviceName') serviceName: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.getUserServiceArtifact(userId, serviceName)
  }

  @Get(':serviceName/sequence/nextval')
  getServiceArtifactSequenceNextval(
    @Param('serviceName') serviceName: ServiceName
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.getServiceArtifactSequenceNextval(serviceName)
  }

  @Get(':userId/:serviceName/shared/list')
  getAllUserServiceArtifacts(
    @Param('userId') userId: string,
    @Param('serviceName') serviceName: ServiceName
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.getAllUserServiceArtifacts(serviceName, userId)
  }

  @Get(':userId/:serviceName/:id')
  getUserServiceArtifactById(
    @Param('userId') userId: string,
    @Param('serviceName') serviceName: string,
    @Param('id') id: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.getUserServiceArtifactById(userId, serviceName, id)
  }

  @Get(':serviceName/:id')
  getServiceArtifactById(
    @Param('serviceName') serviceName: ServiceName,
    @Param('id') id: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.getServiceArtifactById(serviceName, id)
  }

  @Post(':serviceName')
  createServiceArtifact(
    @Param('serviceName') serviceName: ServiceName, 
    @Body() createArtifactDto: any
  ) {
    return this.userArtifactService.createServiceArtifact(serviceName, createArtifactDto)
  }

  @Put(':serviceName/user')
  updateUserServiceArtifact(
    @Param('serviceName') serviceName: ServiceName,
    @Body() updateArtifactDto: any
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.updateUserServiceArtifactEntity(serviceName, updateArtifactDto)
  }

  @Put(':serviceName')
  updateServiceArtifact(
    @Param('serviceName') serviceName: ServiceName,
    @Body() updateArtifactDto: any
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.updateServiceArtifactEntity(serviceName, updateArtifactDto)
  }

  @Delete(':userId/:serviceName/:id')
  deleteUserServiceArtifact(
    @Param('userId') userId: string,
    @Param('serviceName') serviceName: ServiceName | string,
    @Param('id') id: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.deleteUserServiceArtifact(userId, serviceName, id)
  }

  @Delete(':serviceName/:id')
  deleteServiceArtifactEntity(
    @Param('serviceName') serviceName: ServiceName,
    @Param('id') id: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return this.userArtifactService.deleteServiceArtifactEntity(serviceName, id)
  }
}