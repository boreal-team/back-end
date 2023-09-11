import { Module } from "@nestjs/common";
import { FireflyService } from "./firefly.service";
import { HttpModule } from "@nestjs/axios";

@Module({
    imports: [HttpModule],
    providers: [FireflyService],
    exports: [FireflyService]
})
export class FireflyModule { } 