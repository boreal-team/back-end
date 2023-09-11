import { ethers } from "ethers";

export interface ITokenService {

    getContract(name: string, abi: string[]): ethers.Contract;
    getScanUrl(): string;
}