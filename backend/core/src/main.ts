import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  app.setGlobalPrefix('/api')
  app.useLogger(process.env.NODE_ENV === 'production' ? ['error', 'warn', 'fatal'] : ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'])
  await app.listen(process.env.PORT ?? 4000)
}
bootstrap()
