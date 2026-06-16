import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserProfileController } from './user-profile.controller';

/**
 * UsersModule — bundles everything user-related.
 *
 * - Registers the User entity with TypeORM for this module's scope
 * - Exports UsersService so AuthModule can use it later
 * - UsersController exposes admin-only user management endpoints
 */
@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [UsersService],
    controllers: [UsersController, UserProfileController],
    exports: [UsersService],
})
export class UsersModule { }