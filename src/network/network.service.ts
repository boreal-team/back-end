import { Inject, Injectable } from "@nestjs/common";
import { ITokenService } from "./token.interface";
import { PolygonService } from "./polygon/polygon.service";
import { EthereumService } from "./ethereum/ethereum.service";
import { FireflyService } from "src/firefly/firefly.service";
import { ResponseModel } from "src/model/ResponseModel";
import { parseEther } from "ethers/lib/utils";
import { BigNumber, utils } from "ethers";
import { NetworkDatastoreService } from "./network.datastore.service";

@Injectable()
export class NetworkService {

    @Inject()
    private readonly polygonService: PolygonService;

    @Inject()
    private readonly ethereumService: EthereumService;

    @Inject()
    private readonly fireflyService: FireflyService;

    @Inject()
    private readonly datastore: NetworkDatastoreService;

    private readonly ETHEREUM_WSTETH: string = "ETHEREUM_WSTETH"
    private readonly ETHEREUM_WSTETH_ABI =
        [
            "function approve(address spender, uint256 amount) external returns (bool)",
        ];

    private readonly ETHEREUM_WDREX: string = "ETHEREUM_WDREX"
    private readonly ETHEREUM_WDREX_ABI =
        [
            "function mintBoreal(uint256 amount)",
            "function approve(address spender, uint256 amount) external returns (bool)",
        ];

    private readonly BOREAL_DEFI: string = "BOREAL_DEFI"
    private readonly BOREAL_DEFI_ABI =
        [
            "function mintV3position(address token0, address token1, uint256 amount0ToAdd, uint256 amount1ToAdd, uint24 fee, uint256 percentageLower, uint256 percentageUpper) external",
            "function increaseLiquidity(uint256 tokenId, uint256 amount0ToAdd, uint256 amount1ToAdd) external",
            "function decreaseLiquidity(uint256 tokenId, uint24 percentageToDecrease) external",
            "function collectFee(uint256 tokenId) external",
            "function removePosition(uint256 tokenId) external",
            "function swapExactInputSingleHop(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn) external",
            "function swapExactOutputSingleHop(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint256 amountInMax) external",
            "function swapForWNATIVE() external payable",
            "function swapFromWNATIVE(uint256 amount) external",
            "function depositForStETH() external payable returns (uint256 _amount)",
            "function depositForWstETH() external payable",
            "function wrapStETH(uint256 _amount) external",
            "function unwrapWstETH(uint256 _amount) external",
            "function queueSingleWithdraw(uint256[] calldata _amounts) external returns (uint256 _requestID)",
            "function executeWithdraw(uint256 _requestID) external"
        ];

    private contractAddress: string;
    private contractAbi: string[];

    async bridge(network: string, sender: string, amount: number): Promise<ResponseModel> {
        try {
            // Private network
            await this.burnDREX(sender, amount);

            // Public network
            await this.mintWDREX(network, amount);

            // Polygon network works for bridge only...
            if ("ethereum" !== network) {
                return {
                    status: 200,
                    data: "Bridge created with success"
                };
            }

            await this.approve(network, amount);
            console.log(`NetworkService::bridge:: Approved ${amount} DREX token`);

            await this.depositForWstETH(network, amount);
            console.log(`NetworkService::bridge:: Deposited ${amount} DREX token for wstETH`);

            const tokenId = await this.createPosition(network, amount);
            this.datastore.put(`${sender}-tokenid`, `${tokenId}`);
            console.log(this.datastore.values())

            return {
                status: 200,
                data: "Bridge created with success"
            };
        } catch (error) {
            console.error(`NetworkService::bridge:: Error staking tokens: ${error}`);
            return {
                status: 500,
                error: error.message,
                data: "Was not possible to stake tokens"
            };
        }
    }

    async depositForWstETH(network: string, amount: number): Promise<ResponseModel> {
        try {
            const networkService = this.getNetworkService(network);
            const borealContract = networkService.getContract(this.BOREAL_DEFI, this.BOREAL_DEFI_ABI);

            const tx = await borealContract.depositForWstETH({ value: parseEther("0.002") });
            const resp = await tx.wait();
            console.log(`NetworkService::depositForStETH:: Deposit for wstETH with hash ${resp.transactionHash}`);
            return {
                status: 200,
                data: "Deposit for stETH with success"
            };
        } catch (error) {
            console.error(`NetworkService::depositForStETH:: Error depositing for stETH: ${error}`);
            throw error;
        }
    }

    async stake(network: string, sender: string, amount: number): Promise<ResponseModel> {
        if ("ethereum" !== network) {
            throw new Error("Stake is only available for Ethereum network");
        }
        try {
            const networkService = this.getNetworkService(network);
            const borealContract = networkService.getContract(this.BOREAL_DEFI, this.BOREAL_DEFI_ABI);

            const tokenId = this.datastore.get(`${sender}-tokenid`);
            console.log(`NetworkService::stake:: Staking ${amount} DREX token with tokenId ${tokenId}`);
            console.log(this.datastore.values())

            await this.depositForWstETH(network, amount);
            const amount0ToAdd = amount;
            const amount1ToAdd = parseEther("0.001");
            const tx = await borealContract.increaseLiquidity(BigNumber.from(tokenId).toNumber(), amount0ToAdd, amount1ToAdd, { gasLimit: 1000000 });
            await tx.wait();
            return {
                status: 200,
                data: "Stake created with success"
            };
        } catch (error) {
            console.error(`NetworkService::stake:: Error staking tokens: ${error}`);
            return {
                status: 500,
                error: error.message,
                data: "Was not possible to stake tokens"
            };
        }
    }

    private async burnDREX(sender: string, amount: number): Promise<ResponseModel> {
        try {
            const balanceBefore = await this.fireflyService.balanceOf(sender);
            if (balanceBefore < amount) {
                throw new Error(`Cannot burn DREX token. Insufficient balance. Current balance: ${balanceBefore}`);
            }

            await this.fireflyService.burn(sender, amount);
            let balanceAfter = await this.fireflyService.balanceOf(sender);
            let expectedBalance = balanceBefore - amount;
            if (balanceAfter !== expectedBalance) {
                throw new Error(`Invalid balance after burn DREX token. Expected: ${expectedBalance} - Actual: ${balanceAfter}`);
            }

            return {
                status: 200,
                data: "Burned with success"
            };
        } catch (error) {
            console.error(`NetworkService:: burnDrex:: Error burning tokens: ${error}`);
            throw error;
        }
    }

    private async createPosition(network: string, amount: number): Promise<number> {
        try {
            const networkService = this.getNetworkService(network);
            const borealContract = networkService.getContract(this.BOREAL_DEFI, this.BOREAL_DEFI_ABI);

            const token0 = process.env.ETHEREUM_WDREX;
            const token1 = process.env.ETHEREUM_WSTETH;
            const amount0ToAdd = amount;
            const amount1ToAdd = parseEther("0.001");
            const fee = 500;
            const percentageLower = parseEther("0");
            const percentageUpper = parseEther("0.5");

            console.log(`NetworkService:: createPool:: Creating pool with params: token0: ${token0}, token1: ${token1}, amount0ToAdd: ${amount0ToAdd}, amount1ToAdd: ${amount1ToAdd}, fee: ${fee}, percentageLower: ${percentageLower}, percentageUpper: ${percentageUpper}`);

            const createPoolTx = await borealContract.mintV3position(token0, token1, amount0ToAdd, amount1ToAdd, fee, percentageLower, percentageUpper);

            const receipt = await createPoolTx.wait();
            console.log(`NetworkService:: createPool:: Pool created with hash ${receipt.transactionHash}`);
            console.log(receipt.events[receipt.events.length - 1].topics);
            console.log(receipt.data);
            const tokenId = BigNumber.from(receipt.events[receipt.events.length - 1].data).toNumber();
            return tokenId;
        } catch (error) {
            console.error(`NetworkService:: createPool:: Error creating pool: ${error.message}`);
            throw error;
        }
    }

    private async approve(network: string, amount: number): Promise<any> {
        try {
            const networkService = this.getNetworkService(network);
            const contract1 = networkService.getContract(this.ETHEREUM_WDREX, this.ETHEREUM_WDREX_ABI);
            const contract2 = networkService.getContract(this.ETHEREUM_WSTETH, this.ETHEREUM_WSTETH_ABI);
            const tx1 = await contract1.approve(process.env.ETHEREUM_BOREAL_DEFI_ADDRESS, parseEther("1000000000000000"));
            const tx2 = await contract2.approve(process.env.ETHEREUM_BOREAL_DEFI_ADDRESS, parseEther("1000000000000000"));
            await tx1.wait();
            await tx2.wait();
            return {
                tx1: tx1,
                tx2: tx2
            };
        } catch (error) {
            console.error(`NetworkService:: approve:: Error approving token: ${error.message}`);
            throw error;
        }
    }

    private async convertDREXtoETH(amount: number): Promise<BigNumber> {
        const amountInBRL = amount / 100;
        const brlToEthFeedURL = "https://www.coingecko.com/price_charts/279/brl/24_hours.json";

        const brlToEthResp = await fetch(brlToEthFeedURL);
        const brlToEthJson = await brlToEthResp.json();

        const oneETHInBRL = brlToEthJson.stats[0][1];
        const totalBRLInETH = amountInBRL / oneETHInBRL;
        const eth = parseEther(`${totalBRLInETH}`);
        console.log(`NetworkService:: convertDREXtoETH:: Converted ${amount} DREX to ${eth} ETH`);
        return eth;
    }

    async mintWDREX(network: string, amount: number): Promise<any> {
        const networkService = this.getNetworkService(network);
        const contract = networkService.getContract(this.contractAddress, this.contractAbi);
        try {
            console.log(`NetworkService:: mint => Minting ${amount} wDREX token`);
            const tx = await contract.mintBoreal(amount);
            const resp = await tx.wait();
            console.log(`NetworkService:: mint => Minted ${amount} wDREX token with hash ${resp.transactionHash}`);
        } catch (error) {
            console.log(`NetworkService:: mint => Error to mint wDREX token: ${error.message}`);
            throw error;
        }
    }

    private getNetworkService(network: string): ITokenService {
        if ("polygon" === network) {
            this.contractAbi = this.ETHEREUM_WDREX_ABI;
            return this.polygonService;
        } else if ("ethereum" === network) {
            this.contractAddress = this.ETHEREUM_WDREX;
            this.contractAbi = this.ETHEREUM_WDREX_ABI;
            return this.ethereumService;
        }
        return null;
    }
}