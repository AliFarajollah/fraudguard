import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

/**
 * UsersModule — bundles everything user-related.
 *
 * - Registers the User entity with TypeORM for this module's scope
 * - Exports UsersService so AuthModule can use it later
 */
@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }