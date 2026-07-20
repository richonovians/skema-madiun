import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { IkmModule } from './modules/ikm/ikm.module';
import { OpdModule } from './modules/opd/opd.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    // Modul fondasi autentikasi (menyediakan RolesGuard global via APP_GUARD).
    AuthModule,
    // Modul bisnis (masih kosong — tanpa endpoint/logika).
    UsersModule,
    OpdModule,
    SurveysModule,
    QuestionsModule,
    ResponsesModule,
    IkmModule,
    ComplaintsModule,
    AuditModule,
    ReferenceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Urutan penting: ResponseInterceptor didaftarkan lebih dulu sehingga pada fase
    // respons ia berjalan TERAKHIR (membungkus envelope), setelah ClassSerializerInterceptor
    // selesai men-serialize data.
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
