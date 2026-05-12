// src/modules/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchController } from '@modules/search/search.controller';
import { SearchService } from '@modules/search/search.service';
import { SearchRepository } from '@modules/search/search.repository';
import { SearchMapper } from '@modules/search/mappers/search.mapper';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchRepository, SearchMapper],
  exports: [SearchService],
})
export class SearchModule {}
