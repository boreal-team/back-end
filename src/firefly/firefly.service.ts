import { AxiosError } from "axios";
import { HttpService } from "@nestjs/axios";
import { catchError, firstValueFrom } from 'rxjs';
import { Injectable, Logger, Inject } from "@nestjs/common";
import { ResponseModel } from "src/model/ResponseModel";

@Injectable()
export class FireflyService {
    private readonly logger = new Logger(FireflyService.name);
    private readonly FIREFLY_API_ENDPOINT: string;

    @Inject()
    private readonly httpService: HttpService;

    constructor() {
        this.FIREFLY_API_ENDPOINT = process.env.FIREFLY_API_ENDPOINT;
    }

    async burn(sender: string, amount: number): Promise<any> {
        const burnEndpoint = `${this.FIREFLY_API_ENDPOINT}/invoke/burn`;
        const data =
        {
            input: { amount: `${amount}` },
            key: sender
        };

        try {
            return firstValueFrom(
                this.httpService.post(burnEndpoint, data).pipe(
                    catchError((error: AxiosError) => {
                        this.logger.error(error.response?.data || 'An error happened!');
                        throw error;
                    }),
                ),
            );
        } catch (error) {
            throw error;
        }
    }

    async balanceOf(address: string): Promise<number> {
        const balanceOfEndpoint = `${this.FIREFLY_API_ENDPOINT}/query/balanceOf`;
        const data = { input: { account: address } };

        try {
            const response = await firstValueFrom(
                this.httpService.post(balanceOfEndpoint, data).pipe(
                    catchError((error: AxiosError) => {
                        this.logger.error(error.response?.data || 'An error happened!');
                        throw 'An error happened!';
                    }),
                ),
            );

            const balanceAsString = response.data.output;
            const balance = parseInt(balanceAsString, 10);

            if (!isNaN(balance)) {
                return balance;
            } else {
                throw 'Invalid response: Balance is not a number';
            }
        } catch (error) {
            console.error(`Error burning tokens: ${error}`);
            throw error;
        }
    }
}
