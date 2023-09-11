import { Injectable } from "@nestjs/common";
import { ITokenService } from "../token.interface";
import { ethers, Wallet } from "ethers";

@Injectable()
export class PolygonService implements ITokenService {
    private readonly provider: ethers.providers.JsonRpcProvider;
    private readonly wallet: Wallet;
    private readonly etherscanUrl: string;

    constructor() {
        const privateKey = process.env.PRIVATE_KEY_API;
        this.provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_PROVIDER);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.etherscanUrl = process.env.POLYGON_ETHERSCAN_URL;
    }

    getContract(name: string, abi: string[]): ethers.Contract {
        const contractAddress = process.env.POLYGON_WDREX
        return new ethers.Contract(contractAddress, abi, this.wallet);
    }
    
    getScanUrl(): string {
        return this.etherscanUrl;
    }
}