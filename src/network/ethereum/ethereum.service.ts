import { Injectable } from "@nestjs/common";
import { ITokenService } from "../token.interface";
import { ethers, Wallet } from "ethers";

@Injectable()
export class EthereumService implements ITokenService {
    private readonly provider: ethers.providers.JsonRpcProvider;
    private readonly wallet: Wallet;
    private readonly etherscanUrl: string;
    private readonly ETHEREUM_WDREX: string = "ETHEREUM_WDREX"
    private readonly ETHEREUM_BOREAL_DEFI: string = "ETHEREUM_BOREAL_DEFI"
    private readonly ETHEREUM_WSTETH: string = "ETHEREUM_WSTETH"


    public ETHEREUM_WDREX_ADDRESS: string;
    public ETHEREUM_BOREAL_DEFI_ADDRESS: string;

    constructor() {
        const privateKey = process.env.PRIVATE_KEY_API;
        this.provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_PROVIDER);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.etherscanUrl = process.env.ETHEREUM_ETHERSCAN_URL;
        this.ETHEREUM_WDREX_ADDRESS = process.env.ETHEREUM_WDREX;
        this.ETHEREUM_BOREAL_DEFI_ADDRESS = process.env.ETHEREUM_BOREAL_DEFI_ADDRESS;
    }

    getContract(name: string, abi: string[]): ethers.Contract {
        let contractAddress: string;

        if (this.ETHEREUM_WDREX == name) {
            contractAddress = process.env.ETHEREUM_WDREX
        } else if (this.ETHEREUM_WSTETH == name) {
            contractAddress = process.env.ETHEREUM_WSTETH
        } else {
            contractAddress = process.env.ETHEREUM_BOREAL_DEFI_ADDRESS;
        }
        return new ethers.Contract(contractAddress, abi, this.wallet);
    }

    getScanUrl(): string {
        return this.etherscanUrl;
    }
}
