import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { DrizzleModule } from './database/drizzle.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ResearchModule } from './modules/research/research.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { FileModule } from './modules/file/file.module';
import { SearchModule } from './modules/search/search.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { RequestsModule } from './modules/requests/requests.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmailModule } from './modules/email/email.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import r2Config from './config/r2.config';
import emailConfig from './config/email.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, r2Config, emailConfig, appConfig],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ([{
        ttl: 60000,
        limit: 60,
      }]),
    }),
    DrizzleModule,
    AuthModule,
    UsersModule,
    ResearchModule,
    ReferenceModule,
    FileModule,
    SearchModule,
    AnalyticsModule,
    NotificationsModule,
    CollectionsModule,
    RequestsModule,
    AdminModule,
    EmailModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
