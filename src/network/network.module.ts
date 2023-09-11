import { Module } from '@nestjs/common';
import { NetworkService } from './network.service';
import { EthereumService } from './ethereum/ethereum.service';
import { PolygonService } from './polygon/polygon.service';
import { EthersModule } from 'nestjs-ethers';
import { FireflyModule } from 'src/firefly/firefly.module';
import { NetworkController } from './network.controller';
import { NetworkDatastoreService } from './network.datastore.service';

@Module({
    imports: [EthersModule.forRoot(), FireflyModule],
    controllers: [NetworkController],
    providers: [NetworkService, EthereumService, PolygonService, NetworkDatastoreService],
    exports: [NetworkService, EthereumService, PolygonService, NetworkDatastoreService],
})
export class NetworkModule { }
