import { LoggingInterceptor } from '@app/interceptors/logging.interceptor'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  app.setGlobalPrefix('/api')
  app.useLogger(process.env.NODE_ENV === 'production' ? ['error', 'warn', 'fatal', 'log'] : ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'])
  app.useGlobalInterceptors(new LoggingInterceptor())
  await app.listen(process.env.PORT ?? 4000)
}
bootstrap()
