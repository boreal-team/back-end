import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ResponseModel } from 'src/model/ResponseModel';
import { NetworkService } from './network.service';

@Controller('boreal')
export class NetworkController {

    @Inject() private readonly networkService: NetworkService;

    @Post('stake')
    async burn(@Body() body: any): Promise<ResponseModel> {
        const { network, sender, amount } = body;
        try {
            return this.networkService.stake(network, sender, amount);
        } catch (err) {
            return {
                status: 500,
                data: err.message
            };
        }

    }

    @Post('bridge')
    async bridge(@Body() body: any): Promise<ResponseModel> {
        const { network, sender, amount } = body;
        try {
            return this.networkService.bridge(network, sender, amount);
        } catch (err) {
            return {
                status: 500,
                data: err.message
            };
        }

    }
}
