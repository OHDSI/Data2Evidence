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
  async getAllServiceArtifacts(@Param('serviceName') serviceName: ServiceName) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.getAllServiceArtifacts(serviceName)
  }

  @Get(':userId/:serviceName/list')
  async getUserServiceArtifact(
    @Param('userId') userId: string,
    @Param('serviceName') serviceName: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.getUserServiceArtifact(userId, serviceName)
  }

  @Get(':serviceName/sequence/nextval')
  async getServiceArtifactSequenceNextval(
    @Param('serviceName') serviceName: ServiceName
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.getServiceArtifactSequenceNextval(serviceName)
  }

  @Get(':userId/:serviceName/shared/list')
  async getAllUserServiceArtifacts(
    @Param('userId') userId: string,
    @Param('serviceName') serviceName: ServiceName
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.getAllUserServiceArtifacts(serviceName, userId)
  }

  @Get(':userId/:serviceName/:id')
  async getUserServiceArtifactById(
    @Param('userId') userId: string,
    @Param('serviceName') serviceName: string,
    @Param('id') id: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.getUserServiceArtifactById(userId, serviceName, id)
  }

  @Get(':serviceName/:id')
  async getServiceArtifactById(
    @Param('serviceName') serviceName: ServiceName,
    @Param('id') id: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.getServiceArtifactById(serviceName, id)
  }

  @Post(':serviceName')
  async createServiceArtifact(
    @Param('serviceName') serviceName: ServiceName, 
    @Body() createArtifactDto: any
  ) {
    return await this.userArtifactService.createServiceArtifact(serviceName, createArtifactDto)
  }

  @Put(':serviceName/user')
  async updateUserServiceArtifact(
    @Param('serviceName') serviceName: ServiceName,
    @Body() updateArtifactDto: any
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.updateUserServiceArtifactEntity(serviceName, updateArtifactDto)
  }

  @Put(':serviceName')
  async updateServiceArtifact(
    @Param('serviceName') serviceName: ServiceName,
    @Body() updateArtifactDto: any
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.updateServiceArtifactEntity(serviceName, updateArtifactDto)
  }

  @Delete(':userId/:serviceName/:id')
  async deleteUserServiceArtifact(
    @Param('userId') userId: string,
    @Param('serviceName') serviceName: ServiceName | string,
    @Param('id') id: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.deleteUserServiceArtifact(userId, serviceName, id)
  }

  @Delete(':serviceName/:id')
  async deleteServiceArtifactEntity(
    @Param('serviceName') serviceName: ServiceName,
    @Param('id') id: string
  ) {
    if (!(Object.values(ServiceName).includes(serviceName))) {
      throw new BadRequestException(`Invalid service name: ${serviceName}`)
    }
    return await this.userArtifactService.deleteServiceArtifactEntity(serviceName, id)
  }
}