import { customModule, Control, Module, Styles, Input, Button, Panel, Label, Modal, IEventBus, application, Image, Container, customElements, ControlElement, IDataSchema, observable } from '@ijstech/components';
import {} from '@ijstech/eth-contract';
import { Result } from './result/index';
import { TokenSelection } from './token-selection/index';
import { formatNumber, ITokenObject, EventId, limitInputNumber, limitDecimals, IERC20ApprovalAction, INetworkConfig, IPoolConfig, IProviderUI, ModeType, PageBlock, IProvider } from './global/index';
import { BigNumber } from "@ijstech/eth-wallet";
import { getSlippageTolerance, isWalletConnected, setDexInfoList, setProviderList, getChainId, getSupportedTokens, nullAddress} from './store/index';
import { getNewShareInfo, getPricesInfo, addLiquidity, getApprovalModelAction, calculateNewPairShareInfo, getPairFromTokens, getRemoveLiquidityInfo, removeLiquidity, getTokensBack, getTokensBackByAmountOut } from './API';
import { poolAddStyle } from './index.css';
import { assets as tokenAssets, tokenStore } from '@scom/scom-token-list';
import { IWalletPlugin } from '@scom/scom-wallet-modal';
import ScomDappContainer from '@scom/scom-dapp-container';
import getDexList from '@scom/scom-dex-list';

const Theme = Styles.Theme.ThemeVars;

interface ScomAmmPoolElement extends ControlElement {
  providers: IProviderUI[];
  tokens?: ITokenObject[];
  defaultChainId: number;
  networks: INetworkConfig[];
  wallets: IWalletPlugin[];
  mode?: ModeType;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ["i-scom-amm-pool"]: ScomAmmPoolElement;
    }
  }
}

@customModule
@customElements('i-scom-amm-pool')
export default class ScomAmmPool extends Module implements PageBlock {
  private firstInput: Input;
  private secondInput: Input;
  private btnApproveFirstToken: Button;
  private btnApproveSecondToken: Button;
  private btnSupply: Button;
  private confirmSupplyModal: Modal;
  private resultEl: Result;
  private firstTokenSelection: TokenSelection;
  private secondTokenSelection: TokenSelection;
  private firstToken?: ITokenObject;
  private secondToken?: ITokenObject;
  private lbFirstBalance: Label;
  private lbSecondBalance: Label;
  private firstBalance: string = '0';
  private secondBalance: string = '0';
  private lbFirstPrice: Label;
  private lbFirstPriceTitle: Label;
  private lbSecondPrice: Label;
  private lbSecondPriceTitle: Label;
  private lbShareOfPool: Label;
  private isFromEstimated: boolean;
  private approvalModelAction: IERC20ApprovalAction;
  private $eventBus: IEventBus;
  private firstInputAmount: string = '';
  private secondInputAmount: string = '';
  private firstTokenImage1: Image;
  private secondTokenImage1: Image;
  private firstTokenImage2: Image;
  private secondTokenImage2: Image;
  private lbFirstInput: Label;
  private lbSecondInput: Label;
  private lbPoolTokensTitle: Label;
  private lbOutputEstimated: Label;
  private lbFirstDeposited: Label;
  private lbSecondDeposited: Label;
  private lbSummaryFirstPrice: Label;
  private lbSummarySecondPrice: Label;
  private lbShareOfPool2: Label;
  private poolTokenAmount: string;
  private lbPoolTokenAmount: Label;
  private pnlCreatePairMsg: Panel;
  private pricePanel: Panel;
  private dappContainer: ScomDappContainer;

  private pnlLiquidityImage: Panel;
  private lbLiquidityBalance: Label;
  private liquidityInput: Input;
  private pnlLiquidity: Panel;
  private lbLabel1: Label;
  private lbLabel2: Label;
  private pnlInfo: Panel;

  private _data: IPoolConfig = {
    providers: [],
    tokens: [],
    defaultChainId: 0,
    wallets: [],
    networks: []
  }
  private _oldData: IPoolConfig = {
    providers: [],
    tokens: [],
    defaultChainId: 0,
    wallets: [],
    networks: []
  }
  private currentChainId: number;
  private allTokenBalancesMap: any;
  private maxLiquidityBalance: number | string = '0';
  private lpToken: ITokenObject;
  private isInited: boolean = false;
  @observable()
  private removeInfo = {
    maxBalance: '',
    totalPoolTokens:  '',
    poolShare: '',
    tokenAShare: '',
    tokenBShare: ''
  };

  tag: any = {};
  private oldTag: any = {};

  constructor(parent?: Container, options?: any) {
    super(parent, options);
    this.$eventBus = application.EventBus;
    this.registerEvent();
  }

  static async create(options?: ScomAmmPoolElement, parent?: Container){
    let self = new this(parent, options);
    await self.ready();
    return self;
  }

  private get getInputLabel() {
    return this.isFixedPair ? 'Output' : 'Input';
  }

  get firstTokenDecimals() {
    return this.firstToken?.decimals || 18;
  }

  get secondTokenDecimals() {
    return this.secondToken?.decimals || 18;
  }

  get firstTokenSymbol() {
    return this.firstToken?.symbol || '';
  }

  get secondTokenSymbol() {
    return this.secondToken?.symbol || '';
  }

  get providers() {
    return this._data.providers;
  }
  set providers(value: IProviderUI[]) {
    this._data.providers = value;
  }

  get tokens() {
    return this._data.tokens ?? [];
  }
  set tokens(value: ITokenObject[]) {
    this._data.tokens = value;
  }

  get defaultChainId() {
    return this._data.defaultChainId;
  }

  set defaultChainId(value: number) {
    this._data.defaultChainId = value;
  }

  get wallets() {
    return this._data.wallets ?? [];
  }
  set wallets(value: IWalletPlugin[]) {
    this._data.wallets = value;
  }

  get networks() {
    return this._data.networks ?? [];
  }
  set networks(value: INetworkConfig[]) {
    this._data.networks = value;
  }

  get mode() {
    return this._data.mode ?? 'add-liquidity';
  }
  set mode(value: ModeType) {
    this._data.mode = value;
  }

  private get isFixedPair() {
    return this._data?.mode === 'remove-liquidity';
  }

  private get originalData() {
    if (!this._data) return undefined;
    const { mode, providers } = this._data;
    if (!providers.length) return undefined;
    let _providers: IProvider[] = [];
    if (this.isFixedPair) {
      const { key, caption, image, dexId } = providers[0];
      let defaultProvider: IProvider = {
        caption,
        image,
        key,
        dexId
      };
      _providers.push(defaultProvider);
    } else {
      let providersByKeys: { [key: string]: IProviderUI[] } = {};
      providers.forEach(v => {
        if (!providersByKeys[v.key]) {
          providersByKeys[v.key] = [];
        }
        providersByKeys[v.key].push(v);
      });
      Object.keys(providersByKeys).forEach(k => {
        const arr = providersByKeys[k];
        const { key, caption, image, dexId } = arr[0];
        let defaultProvider: IProvider = {
          caption,
          image,
          key,
          dexId
        }
        _providers.push(defaultProvider);
      })
    }
    return { mode, providers: _providers };
  }

  getEmbedderActions() {
    const propertiesSchema: IDataSchema = {
      type: "object",
      properties: {
        mode: {
          type: "string",
          required: true,
          enum: [
            "add-liquidity",
            "remove-liquidity"
          ]
        },
        providers: {
          type: "array",
          required: true,
          items: {
            type: "object",
            properties: {
              caption: {
                type: "string",
                required: true
              },
              image: {
                type: "string",
                required: true
              },
              key: {
                type: "string",
                required: true
              },
              dexId: {
                type: "number"
              },
              chainId: {
                type: "number",
                enum: [1, 56, 137, 250, 97, 80001, 43113, 43114],
                required: true
              }
            }
          }
        }
      }
    }

    const themeSchema: IDataSchema = {
      type: 'object',
      properties: {
        "dark": {
          type: 'object',
          properties: {
            backgroundColor: {
              type: 'string',
              format: 'color',
              readOnly: true
            },
            fontColor: {
              type: 'string',
              format: 'color',
              readOnly: true
            },
            inputBackgroundColor: {
              type: 'string',
              format: 'color',
              readOnly: true
            },
            inputFontColor: {
              type: 'string',
              format: 'color',
              readOnly: true
            }
          }
        },
        "light": {
          type: 'object',
          properties: {
            backgroundColor: {
              type: 'string',
              format: 'color',
              readOnly: true
            },
            fontColor: {
              type: 'string',
              format: 'color',
              readOnly: true
            },
            inputBackgroundColor: {
              type: 'string',
              format: 'color',
              readOnly: true
            },
            inputFontColor: {
              type: 'string',
              format: 'color',
              readOnly: true
            }
          }
        }
      }
    }

    return this._getActions(propertiesSchema, themeSchema);
  }

  getActions() {
    const propertiesSchema: IDataSchema = {
      type: "object",
      properties: {
        mode: {
          type: "string",
          required: true,
          enum: [
            "add-liquidity",
            "remove-liquidity"
          ]
        },
        providers: {
          type: "array",
          required: true,
          items: {
            type: "object",
            properties: {
              caption: {
                type: "string",
                required: true
              },
              image: {
                type: "string",
                required: true
              },
              key: {
                type: "string",
                required: true
              },
              dexId: {
                type: "number"
              },
              chainId: {
                type: "number",
                enum: [1, 56, 137, 250, 97, 80001, 43113, 43114],
                required: true
              }
            }
          }
        }
      }
    }

    const themeSchema: IDataSchema = {
      type: 'object',
      properties: {
        "dark": {
          type: 'object',
          properties: {
            backgroundColor: {
              type: 'string',
              format: 'color'
            },
            fontColor: {
              type: 'string',
              format: 'color'
            },
            inputBackgroundColor: {
              type: 'string',
              format: 'color'
            },
            inputFontColor: {
              type: 'string',
              format: 'color'
            }
          }
        },
        "light": {
          type: 'object',
          properties: {
            backgroundColor: {
              type: 'string',
              format: 'color'
            },
            fontColor: {
              type: 'string',
              format: 'color'
            },
            inputBackgroundColor: {
              type: 'string',
              format: 'color'
            },
            inputFontColor: {
              type: 'string',
              format: 'color'
            }
          }
        }
      }
    }

    return this._getActions(propertiesSchema, themeSchema);
  }

  _getActions(propertiesSchema: IDataSchema, themeSchema: IDataSchema) {
    const actions = [
      {
        name: 'Settings',
        icon: 'cog',
        command: (builder: any, userInputData: any) => {
          return {
            execute: async () => {
              this._oldData = {...this._data};
              // this.configDApp.data = this._data;
              this.setData(userInputData);
            },
            undo: () => {
              this._data = {...this._oldData};
              // this.configDApp.data = this._data;
              this.setData(this._data);
            },
            redo: () => { }
          }
        },
        userInputDataSchema: propertiesSchema
      },
      {
        name: 'Theme Settings',
        icon: 'palette',
        command: (builder: any, userInputData: any) => {
          return {
            execute: async () => {
              if (!userInputData) return;
              this.oldTag = { ...this.tag };
              this.setTag(userInputData);
              if (builder) builder.setTag(userInputData);
              if (this.dappContainer) this.dappContainer.setTag(userInputData);
            },
            undo: () => {
              if (!userInputData) return;
              this.setTag(this.oldTag);
              if (builder) builder.setTag(this.oldTag);
              if (this.dappContainer) this.dappContainer.setTag(this.oldTag);
            },
            redo: () => { }
          }
        },
        userInputDataSchema: themeSchema
      }
    ]
    return actions
  }

  registerEvent() {
    this.$eventBus.register(this, EventId.IsWalletConnected, this.onWalletConnect)
    this.$eventBus.register(this, EventId.IsWalletDisconnected, this.onWalletDisconnect)
    this.$eventBus.register(this, EventId.chainChanged, this.onChainChange)
  }

  onWalletConnect = async (connected: boolean) => {
    if (connected && (this.currentChainId == null || this.currentChainId == undefined)) {
      this.onChainChange();
    } else {
      if (this.originalData?.providers?.length) await this.onSetupPage(connected);
    }
  }

  onWalletDisconnect = async (connected: boolean) => {
    if (!connected)
      await this.onSetupPage(connected);
  }

  onChainChange = async () => {
    this.currentChainId = getChainId();
    if (this.originalData?.providers?.length) await this.onSetupPage(true);
    this.updateButtonText();
  }

  getData() {
    return this._data;
  }

  async setData(data: IPoolConfig) {
    this._data = data;
    await this.refreshUI();
  }

  private async refreshUI() {
    if (!this.lbFirstBalance.isConnected) await this.lbFirstBalance.ready();
    if (!this.lbSecondBalance.isConnected) await this.lbSecondBalance.ready();
    if (!this.firstInput.isConnected) await this.firstInput.ready();
    if (!this.secondInput.isConnected) await this.secondInput.ready();
    this.resetFirstInput();
    this.resetSecondInput();
    const dexList = getDexList();
    setDexInfoList(dexList);
    this.setProviders();
    await this.initData();
    await this.onSetupPage(isWalletConnected());
  }

  async getTag() {
    return this.tag;
  }

  private updateTag(type: 'light'|'dark', value: any) {
    this.tag[type] = this.tag[type] ?? {};
    for (let prop in value) {
      if (value.hasOwnProperty(prop))
        this.tag[type][prop] = value[prop];
    }
  }

  async setTag(value: any) {
    const newValue = value || {};
    if (newValue.light) this.updateTag('light', newValue.light);
    if (newValue.dark) this.updateTag('dark', newValue.dark);
    if (this.dappContainer)
      this.dappContainer.setTag(this.tag);
    this.updateTheme();
  }

  private updateStyle(name: string, value: any) {
    value ?
      this.style.setProperty(name, value) :
      this.style.removeProperty(name);
  }

  private updateTheme() {
    const themeVar = this.dappContainer?.theme || 'light';
    this.updateStyle('--text-primary', this.tag[themeVar]?.fontColor);
    this.updateStyle('--background-main', this.tag[themeVar]?.backgroundColor);
    this.updateStyle('--input-font_color', this.tag[themeVar]?.inputFontColor);
    this.updateStyle('--input-background', this.tag[themeVar]?.inputBackgroundColor);
  }

  private onSetupPage = async (connected: boolean, _chainId?: number) => {
    const data: any = { 
      defaultChainId: this.defaultChainId, 
      wallets: this.wallets, 
      networks: this.networks
    }
    if (this.dappContainer?.setData) this.dappContainer.setData(data)
    this.currentChainId = _chainId ? _chainId : getChainId();
    if (!this.btnSupply.isConnected) await this.btnSupply.ready();
    if (!this.lbFirstBalance.isConnected) await this.lbFirstBalance.ready();
    if (!this.lbSecondBalance.isConnected) await this.lbSecondBalance.ready();
    if (!this.lbLabel1.isConnected) await this.lbLabel1.ready();
    if (!this.lbLabel2.isConnected) await this.lbLabel2.ready();
    tokenStore.updateTokenMapData();
    if (connected) {
      await tokenStore.updateAllTokenBalances();
      if (!this.approvalModelAction) await this.initApprovalModelAction();
    }
    this.pnlLiquidity.visible = this.isFixedPair;
    this.firstTokenSelection.isBtnMaxShown = !this.isFixedPair;
    this.secondTokenSelection.isBtnMaxShown = !this.isFixedPair;
    this.firstTokenSelection.disableSelect = this.isFixedPair;
    this.secondTokenSelection.disableSelect = this.isFixedPair;
    this.firstTokenSelection.tokenDataListProp = getSupportedTokens(this._data.tokens || [], this.currentChainId);
    this.secondTokenSelection.tokenDataListProp = getSupportedTokens(this._data.tokens || [], this.currentChainId);
    this.lbLabel1.caption = this.getInputLabel;
    this.lbLabel2.caption = this.getInputLabel;
    this.isFixedPair && this.setFixedPairData();
    if (connected) {
      try {
        this.updateButtonText();
        await this.updateBalance();
        if (this.firstToken && this.secondToken) {
          if (!this.lbFirstPriceTitle.isConnected) await this.lbFirstPriceTitle.ready();
          this.lbFirstPriceTitle.caption = `${this.secondToken.symbol} per ${this.firstToken.symbol}`;
          if (!this.lbSecondPriceTitle.isConnected) await this.lbSecondPriceTitle.ready();
          this.lbSecondPriceTitle.caption = `${this.firstToken.symbol} per ${this.secondToken.symbol}`;
        }
        const isShown = parseFloat(this.firstBalance) > 0 && parseFloat(this.secondBalance) > 0;
        this.pricePanel.visible = isShown || this.isFixedPair;
        await this.checkPairExists();
        await this.callAPIBundle(false);
        if (this.isFixedPair) {
          this.renderLiquidity();
          if (new BigNumber(this.liquidityInput.value).gt(0))
            this.approvalModelAction.checkAllowance(this.lpToken, this.liquidityInput.value);
        } else {
          this.pnlInfo.clearInnerHTML();
          this.pnlInfo.append(
            <i-label font={{color: Theme.colors.warning.main}} caption="*OpenSwap is in Beta, please use it at your own discretion"></i-label>
          )
        }
      } catch {
        this.btnSupply.caption = this.isFixedPair ? 'Remove' : 'Supply';
      }
    } else {
      this.resetData();
    }
  }

  private renderLiquidity() {
    let firstTokenImagePath = tokenAssets.tokenPath(this.firstToken, getChainId());
    let secondTokenImagePath = tokenAssets.tokenPath(this.secondToken, getChainId());
    this.pnlLiquidityImage.clearInnerHTML();
    this.pnlLiquidityImage.append(
      <i-hstack horizontalAlignment="space-between" verticalAlignment="center" gap="4px">
        <i-button
          caption="Max"
          font={{color: '#fff'}}
          padding={{top: '0.25rem', bottom: '0.25rem', left: '0.5rem', right: '0.5rem'}}
          background={{color: Theme.background.gradient}}
          onClick={() => this.setMaxLiquidityBalance()}
        />
        <i-image width={20} height={20} url={firstTokenImagePath} />
        <i-image width={20} height={20} url={secondTokenImagePath} />
        <i-label font={{color: Theme.colors.warning.main}} caption={this.firstTokenSymbol || '-'} />
        <i-label font={{color: Theme.colors.warning.main}} caption="-" />
        <i-label font={{color: Theme.colors.warning.main}} caption={this.secondTokenSymbol || '-'} />
      </i-hstack>
    )
    this.pnlInfo.clearInnerHTML();
    this.pnlInfo.append(
      <i-vstack padding={{left: '1rem', right: '1rem'}} gap="0.5rem" margin={{top: '1.75rem'}}>
        <i-label font={{color: '#E53780'}} caption="Your position" />
        <i-hstack horizontalAlignment="space-between">
          <i-hstack verticalAlignment="center" gap={4}>
            <i-image url={firstTokenImagePath} width={20} height={20}/>
            <i-image url={secondTokenImagePath} width={20} height={20}/>
            <i-label caption={`${this.firstTokenSymbol} / ${this.secondTokenSymbol}`}/>
          </i-hstack>
          <i-label caption={this.removeInfo.totalPoolTokens} />
        </i-hstack>
        <i-hstack horizontalAlignment="space-between">
          <i-label font={{color: '#E53780'}} caption="Your Pool Share" />
          <i-label caption={this.removeInfo.poolShare} />
        </i-hstack>
        <i-hstack horizontalAlignment="space-between">
          <i-label caption={this.firstTokenSymbol} />
          <i-label caption={this.removeInfo.tokenAShare} />
        </i-hstack>
        <i-hstack horizontalAlignment="space-between">
          <i-label caption={this.secondTokenSymbol} />
          <i-label caption={this.removeInfo.tokenBShare} />
        </i-hstack>
      </i-vstack>
    )
  }

  private setFixedPairData() {
    let currentChainTokens = this.tokens.filter((token) => token.chainId === this.currentChainId);
    if (currentChainTokens.length < 2) return;
    const providers = this.originalData?.providers;
    if (providers && providers.length) {
      const fromTokenAddress = currentChainTokens[0].address;
      const toTokenAddress = currentChainTokens[1].address;
      const fromToken = fromTokenAddress.toLowerCase().startsWith('0x') ? fromTokenAddress.toLowerCase() : fromTokenAddress;
      const toToken = toTokenAddress.toLowerCase().startsWith('0x') ? toTokenAddress.toLowerCase() : toTokenAddress;
      this.firstToken = tokenStore.tokenMap[fromToken];
      this.secondToken = tokenStore.tokenMap[toToken];
      this.onUpdateToken(this.firstToken, true);
      this.onUpdateToken(this.secondToken, false);
      this.firstTokenSelection.token = this.firstToken;
      this.secondTokenSelection.token = this.secondToken;
    }
  }

  private async initTokenSelection() {
    if (this.isInited) return;
    await this.firstTokenSelection.ready();
    await this.secondTokenSelection.ready();
    this.firstTokenSelection.disableSelect = false;
    this.firstTokenSelection.onSelectToken = (token: ITokenObject) => this.onSelectToken(token, true);
    this.firstTokenSelection.onSetMaxBalance = () => this.setMaxBalance(true);
    this.firstTokenSelection.isCommonShown = false;
    this.secondTokenSelection.disableSelect = false;
    this.secondTokenSelection.onSelectToken = (token: ITokenObject) => this.onSelectToken(token, false);
    this.secondTokenSelection.onSetMaxBalance = () => this.setMaxBalance(false);
    this.secondTokenSelection.isCommonShown = false;
    this.isInited = true;
  }

  private getBalance(token?: ITokenObject) {
    if (token && this.allTokenBalancesMap) {
      const address = token.address || '';
      let balance = address ? this.allTokenBalancesMap[address.toLowerCase()] ?? 0 : this.allTokenBalancesMap[token.symbol] || 0;
      return balance
    }
    return 0;
  }

  private async updateBalance() {
    if (isWalletConnected()) await tokenStore.updateAllTokenBalances();
    if (this.isFixedPair) {
      this.lbFirstBalance.visible = false;
      this.lbSecondBalance.visible = false;
      return;
    }
    this.allTokenBalancesMap = isWalletConnected() ? tokenStore.tokenBalances : [];
    if (this.firstToken) {
      this.firstBalance = this.getBalance(this.firstToken);
      this.lbFirstBalance.caption = `Balance: ${formatNumber(this.firstBalance, 4)} ${this.firstToken.symbol}`;
    } else {
      this.firstInput.value = '';
      this.firstToken = Object.values(tokenStore.tokenMap).find(v => v.isNative);
      this.firstTokenSelection.token = this.firstToken;
      this.firstBalance = tokenStore.getTokenBalance(this.firstToken!);
      this.lbFirstBalance.caption = `Balance: ${formatNumber(this.firstBalance)}`;
    }
    if (this.secondToken) {
      this.secondBalance = this.getBalance(this.secondToken);
      this.lbSecondBalance.caption = `Balance: ${formatNumber(this.secondBalance, 4)} ${this.secondToken.symbol}`;
    } else {
      this.secondToken = undefined;
      this.secondInput.value = '';
      this.secondBalance = '0';
      this.secondTokenSelection.token = this.secondToken;
      this.lbSecondBalance.caption = '-';
    }
  }

  private resetData() {
    this.btnSupply.caption = 'Connect Wallet';
    this.btnSupply.enabled = false;
    this.btnApproveFirstToken.visible = false;
    this.btnApproveSecondToken.visible = false;
    this.lbFirstBalance.caption = 'Balance: 0';
    this.lbSecondBalance.caption = 'Balance: 0';
    this.initTokenSelection();
  }

  private async initData() {
    await this.initTokenSelection();
    await this.initApprovalModelAction();
  }

  private setProviders() {
    const providers = this.originalData?.providers || [];
    if (this.isFixedPair) {
      setProviderList([providers[0]]);
    } else {
      setProviderList(providers);
    }
  }

  updateButtonText() {
    if (!this.btnSupply || !this.btnSupply.hasChildNodes()) return;
    this.btnSupply.enabled = false;
    if (!isWalletConnected()) {
      this.btnSupply.caption = 'Connect Wallet';
      return;
    }
    if (this.btnSupply.rightIcon.visible) {
      this.btnSupply.caption = 'Loading';
    } else if (this.isFixedPair) {
      this.btnSupply.caption = 'Remove';
    } else if (
      !this.firstToken?.symbol ||
      !this.secondToken?.symbol ||
      [this.firstToken?.symbol, this.secondToken?.symbol].every(v => v === 'ETH' || v === 'WETH')
    ) {
      this.btnSupply.caption = 'Invalid Pair';
    } else if (new BigNumber(this.firstInput.value).isZero() || new BigNumber(this.secondInput.value).isZero()) {
      this.btnSupply.caption = 'Enter Amount';
    } else if (new BigNumber(this.firstInput.value).gt(this.firstBalance)) {
      this.btnSupply.caption = `Insufficient ${this.firstToken?.symbol} balance`;
    } else if (new BigNumber(this.secondInput.value).gt(this.secondBalance)) {
      this.btnSupply.caption = `Insufficient ${this.secondToken?.symbol} balance`;
    } else if (new BigNumber(this.firstInput.value).gt(0) && new BigNumber(this.secondInput.value).gt(0)) {
      this.btnSupply.caption = 'Supply';
      this.btnSupply.enabled = !(this.btnApproveFirstToken.visible || this.btnApproveSecondToken.visible);
    } else {
      this.btnSupply.caption = 'Enter Amount';
    }
  }

  private onCheckInput(value: string) {
    const inputValue = new BigNumber(value);
    if (inputValue.isNaN()) {
      this.firstInput.value = '';
      this.firstInputAmount = '0';
      this.secondInput.value = '';
      this.secondInputAmount = '0';
      return false;
    }
    return inputValue.gt(0);
  }

  private async handleOutputChange(source: Control, event: Event) {
    if (!this.firstToken || !this.secondToken) return;
    if (source === this.firstInput) {
      limitInputNumber(this.firstInput, this.firstToken.decimals);
      let tokensBack = await getTokensBackByAmountOut(this.firstToken, this.secondToken, this.firstToken, this.firstInput.value);
      if (tokensBack) {
        this.liquidityInput.value = tokensBack.liquidity;
        this.secondInput.value = tokensBack.amountB;
      }
    } else {
      limitInputNumber(this.secondInput, this.secondToken.decimals);
      let tokensBack = await getTokensBackByAmountOut(this.firstToken, this.secondToken, this.secondToken, this.secondInput.value);
      if (tokensBack) {
        this.liquidityInput.value = tokensBack.liquidity;
        this.firstInput.value = tokensBack.amountA;
      }
    }
    this.approvalModelAction.checkAllowance(this.lpToken, this.liquidityInput.value);
  }

  private async handleInputChange(source: Control, event: Event) {
    let amount = (source as Input).value;
    if (source == this.firstInput) {
      limitInputNumber(this.firstInput, this.firstTokenDecimals);
      amount = this.firstInput.value;
      if (this.firstInputAmount === amount) return;
    } else {
      limitInputNumber(this.secondInput, this.secondTokenDecimals);
      amount = this.secondInput.value;
      if (this.secondInputAmount === amount) return;
    }
    if (!this.onCheckInput(amount)) {
      this.updateButtonText();
      return;
    };
    this.updateButton(true);
    try {
      this.isFromEstimated = source === this.secondInput;
      if (source === this.firstInput)
        this.firstInputAmount = this.firstInput.value;
      else if (source === this.secondInput)
        this.secondInputAmount = this.secondInput.value;
      await this.checkPairExists();
      await this.callAPIBundle(true);
      this.updateButton(false);
    } catch {
      this.updateButton(false);
    }
  }

  async handleEnterAmount(source: Control, event: Event) {
    if (this.isFixedPair) {
      await this.handleOutputChange(source, event);
    } else {
      await this.handleInputChange(source, event);
    }
  }

  async resetFirstInput() {
    this.firstToken = undefined;
    this.firstBalance = '0';
    this.lbFirstBalance.caption = '-';
    this.firstInput.value = '';
    this.btnApproveFirstToken.visible = false;
    this.btnApproveSecondToken.visible = false;
  }

  resetSecondInput() {
    this.secondToken = undefined;
    this.secondBalance = '0';
    this.lbSecondBalance.caption = '-';
    this.secondInput.value = '';
    this.btnApproveFirstToken.visible = false;
    this.btnApproveSecondToken.visible = false;
  }

  private async setMaxBalance(isFrom: boolean) {
    if (!isWalletConnected()) return;
    this.isFromEstimated = !isFrom;
    if (isFrom) {
      const maxVal = limitDecimals(this.firstBalance, this.firstTokenDecimals);
      this.firstInputAmount = maxVal;
      this.firstInput.value = maxVal;
    } else {
      const maxVal = limitDecimals(this.secondBalance, this.secondTokenDecimals);
      this.secondInputAmount = maxVal;
      this.secondInput.value = maxVal;
    }
    if (!this.onCheckInput(isFrom ? this.firstBalance : this.secondBalance)) {
      this.updateButtonText();
      return;
    };
    this.updateButton(true);
    try {
      await this.checkPairExists();
      await this.callAPIBundle(true);
    } catch {}
    this.updateButton(false);
  }

  private setMaxLiquidityBalance() {
    if (!this.firstToken || !this.secondToken) return;
    this.liquidityInput.value = this.maxLiquidityBalance;
    this.onLiquidityChange();
  }

  private async onLiquidityChange() {
    if (!this.firstToken || !this.secondToken) return;
    limitInputNumber(this.liquidityInput, 18);
    let tokensBack = await getTokensBack(this.firstToken, this.secondToken, this.liquidityInput.value);
    if (tokensBack) {
      this.firstInput.value = tokensBack.amountA;
      this.secondInput.value = tokensBack.amountB;
    }
    this.approvalModelAction.checkAllowance(this.lpToken, this.liquidityInput.value);
  }

  updateButton(status: boolean) {
    this.btnSupply.rightIcon.visible = status;
    this.updateButtonText();
    this.firstTokenSelection.enabled = !status;
    this.secondTokenSelection.enabled = !status;
  }

  async onUpdateToken(token: ITokenObject, isFrom: boolean) {
    const symbol = token.symbol;
    const balance = this.getBalance(token);
    if (isFrom) {
      this.firstToken = token;
      if (this.secondToken?.symbol === symbol) {
        this.secondTokenSelection.token = undefined;
        this.resetSecondInput();
        if (this.firstInput.isConnected) this.firstInput.value = '';
        this.firstInputAmount = '';
      } else {
        const limit = limitDecimals(this.firstInputAmount, token.decimals || 18);
        if (!new BigNumber(this.firstInputAmount).eq(limit)) {
          if (this.firstInput.isConnected) this.firstInput.value = limit;
          this.firstInputAmount = limit;
        }
      }
      this.firstBalance = balance;
      if (this.lbFirstBalance.isConnected)
        this.lbFirstBalance.caption = `Balance: ${formatNumber(balance)}`;
    } else {
      this.secondToken = token;
      if (this.firstToken?.symbol === symbol) {
        this.firstTokenSelection.token = undefined;
        this.resetFirstInput();
        if (this.secondInput.isConnected) this.secondInput.value = '';
        this.secondInputAmount = '';
      } else {
        const limit = limitDecimals(this.secondInputAmount, token.decimals || 18);
        if (!new BigNumber(this.secondInputAmount).eq(limit)) {
          if (this.secondInput.isConnected) this.secondInput.value = limit;
          this.secondInputAmount = limit;
        }
      }
      this.secondBalance = balance;
      if (this.lbSecondBalance.isConnected)
        this.lbSecondBalance.caption = `Balance: ${formatNumber(balance)}`;
    }
  }

  async onSelectToken(token: any, isFrom: boolean) {
    if (!token) return;
    const symbol = token.symbol;
    if ((isFrom && this.firstToken?.symbol === symbol) || (!isFrom && this.secondToken?.symbol === symbol)) return;
    this.updateButton(true);
    try {
      this.onUpdateToken(token, isFrom);
      const isShown = parseFloat(this.firstBalance) > 0 && parseFloat(this.secondBalance) > 0;
      this.pricePanel.visible = isShown || this.isFixedPair;
      if (this.firstToken && this.secondToken) {
        this.lbFirstPriceTitle.caption = `${this.secondToken.symbol} per ${this.firstToken.symbol}`;
        this.lbSecondPriceTitle.caption = `${this.firstToken.symbol} per ${this.secondToken.symbol}`
        await this.checkPairExists();
      }
      await this.callAPIBundle(false);
      this.btnSupply.rightIcon.visible = false;
      this.updateButton(false);
    } catch {
      this.updateButton(false);
    }
  }

  handleApprove(source: Control, event: Event) {
    if (this.isFixedPair) {
      this.approvalModelAction.doApproveAction(this.lpToken, this.liquidityInput.value);
    } else if (source === this.btnApproveFirstToken) {
      this.showResultMessage(this.resultEl, 'warning', `Approving ${this.secondToken?.symbol} allowance`);
      this.btnApproveFirstToken.rightIcon.visible = true;
      if (this.firstToken) {
        this.approvalModelAction.doApproveAction(this.firstToken, this.firstInputAmount);
      }
      this.btnApproveFirstToken.rightIcon.visible = false;
    }
    else if (source === this.btnApproveSecondToken) {
      this.showResultMessage(this.resultEl, 'warning', `Approving ${this.secondToken?.symbol} allowance`);
      this.btnApproveSecondToken.rightIcon.visible = true;
      if (this.secondToken) {
        this.approvalModelAction.doApproveAction(this.secondToken, this.secondInputAmount);
      }
      this.btnApproveSecondToken.rightIcon.visible = false;
    }
  }

  private handleAction() {
    this.isFixedPair ?
    this.approvalModelAction.doPayAction() :
    this.handleSupply()
  }

  handleSupply() {
    if (!this.firstToken || !this.secondToken) return;
    const chainId = getChainId();
    this.firstTokenImage1.url = this.firstTokenImage2.url = tokenAssets.tokenPath(this.firstToken, chainId);
    this.secondTokenImage1.url = this.secondTokenImage2.url = tokenAssets.tokenPath(this.secondToken, chainId);
    this.lbFirstInput.caption = formatNumber(this.firstInputAmount, 4);
    this.lbSecondInput.caption = formatNumber(this.secondInputAmount, 4);
    this.lbPoolTokensTitle.caption = `${this.firstToken.symbol}/${this.secondToken.symbol} Pool Tokens`;
    this.lbOutputEstimated.caption = `Output is estimated. If the price changes by more than ${getSlippageTolerance()}% your transaction will revert.`
    this.lbFirstDeposited.caption = `${this.firstToken.symbol} Deposited`;
    this.lbSecondDeposited.caption = `${this.secondToken.symbol} Deposited`;
    this.lbSummaryFirstPrice.caption = `1 ${this.secondToken.symbol} = ${this.lbFirstPrice.caption} ${this.firstToken.symbol}`;
    this.lbSummarySecondPrice.caption = `1 ${this.firstToken.symbol} = ${this.lbSecondPrice.caption} ${this.secondToken.symbol}`;
    this.lbShareOfPool2.caption = this.lbShareOfPool.caption;
    this.lbPoolTokenAmount.caption = formatNumber(this.poolTokenAmount, 4);
    this.confirmSupplyModal.visible = true;
  }

  handleConfirmSupply() {
    this.approvalModelAction.doPayAction();
  }

  onSubmit() {
    if (this.isFixedPair)
      removeLiquidity(
        this.firstToken,
        this.secondToken,
        this.liquidityInput.value,
        this.firstInput.value,
        this.secondInput.value
      );
    else {
      this.showResultMessage(this.resultEl, 'warning', `Add Liquidity Pool ${this.firstToken.symbol}/${this.secondToken.symbol}`);
      if (this.isFromEstimated) {
        addLiquidity(
          this.secondToken,
          this.firstToken,
          this.secondInputAmount,
          this.firstInputAmount
        );
      }
      else {
        addLiquidity(
          this.firstToken,
          this.secondToken,
          this.firstInputAmount,
          this.secondInputAmount
        );
      }
    }
  }

  async initApprovalModelAction() {
    if (!isWalletConnected()) return;
    this.approvalModelAction = await getApprovalModelAction({
      sender: this,
      payAction: async () => {
        if (!this.firstToken || !this.secondToken) return;
        this.onSubmit();
      },
      onToBeApproved: async (token: ITokenObject) => {
        if (token == this.firstToken || this.isFixedPair) {
          this.btnApproveFirstToken.caption = `Approve ${this.isFixedPair ? '' : token.symbol}`;
          this.btnApproveFirstToken.visible = true
          this.btnApproveFirstToken.enabled = true;
          this.btnSupply.enabled = false;
        }
        else if (token == this.secondToken) {
          this.btnApproveSecondToken.caption = `Approve ${token.symbol}`;
          this.btnApproveSecondToken.visible = true
          this.btnApproveSecondToken.enabled = true;
          this.btnSupply.enabled = false;
        }
      },
      onToBePaid: async (token: ITokenObject) => {
        if (this.isFixedPair) {
          this.btnApproveFirstToken.enabled = false;
          this.btnApproveFirstToken.visible = true;
          this.btnSupply.enabled = new BigNumber(this.liquidityInput.value).gt(0);
        } else {
          if (token === this.firstToken)
            this.btnApproveFirstToken.visible = false;
          else if (token === this.secondToken)
            this.btnApproveSecondToken.visible = false;
        }
      },
      onApproving: async (token: ITokenObject, receipt?: string) => {
        if (token == this.firstToken || this.isFixedPair) {
          this.btnApproveFirstToken.rightIcon.visible = true;
          this.btnApproveFirstToken.enabled = false;
          this.btnApproveFirstToken.caption = `Approving ${this.isFixedPair ? '' : token.symbol}`;
        }
        else if (token == this.secondToken) {
          this.btnApproveSecondToken.rightIcon.visible = true;
          this.btnApproveSecondToken.enabled = false;
          this.btnApproveSecondToken.caption = `Approving ${token.symbol}`;
        }
        if (receipt) {
          this.showResultMessage(this.resultEl, 'success', receipt);
        }
      },
      onApproved: async (token: ITokenObject) => {
        if (token == this.firstToken || token.symbol == this.firstToken?.symbol || this.isFixedPair) {
          this.btnApproveFirstToken.rightIcon.visible = false;
          this.btnApproveFirstToken.visible = false;
        }
        else if (token == this.secondToken || token.symbol == this.secondToken?.symbol) {
          this.btnApproveSecondToken.rightIcon.visible = false;
          this.btnApproveSecondToken.visible = false;
        }
        if (this.isFixedPair) {
          this.btnApproveFirstToken.caption = 'Approved';
          this.btnSupply.enabled = new BigNumber(this.liquidityInput.value).gt(0);
        } else this.updateButtonText();
      },
      onApprovingError: async (token: ITokenObject, err: Error) => {
        this.showResultMessage(this.resultEl, 'error', err);
        if (this.isFixedPair) {
          this.btnApproveFirstToken.rightIcon.visible = false;
          this.btnApproveFirstToken.enabled = true;
          this.btnApproveFirstToken.caption = 'Approve';
        }
      },      
      onPaying: async (receipt?: string) => {
        if (receipt) {
          this.showResultMessage(this.resultEl, 'success', receipt);
        }
        this.confirmSupplyModal.visible = false;
        this.btnSupply.rightIcon.visible = true;
      },
      onPaid: async () => {
        if (this.isFixedPair) return;
        await tokenStore.updateAllTokenBalances();
        if (this.firstToken) {
          this.firstBalance = tokenStore.getTokenBalance(this.firstToken);
          this.lbFirstBalance.caption = `Balance: ${formatNumber(this.firstBalance)}`;
        }
        if (this.secondToken) {
          this.secondBalance = tokenStore.getTokenBalance(this.secondToken);
          this.lbSecondBalance.caption = `Balance: ${formatNumber(this.secondBalance)}`;
        }
        this.btnSupply.rightIcon.visible = false;
      },
      onPayingError: async (err: Error) => {
        this.showResultMessage(this.resultEl, 'error', err);
        this.btnSupply.rightIcon.visible = false;
      }
    });
  }

  async checkPairExists() {
    if (this.isFixedPair || !this.firstToken || !this.secondToken)
      return;
    try {
      let pair = await getPairFromTokens(this.firstToken, this.secondToken);
      if (!pair || pair.address === nullAddress) {
        this.toggleCreateMessage(true)
      } else {
        let totalSupply = await pair?.totalSupply();
        this.toggleCreateMessage(totalSupply?.isZero())
      }
    } catch (err) {
      this.toggleCreateMessage(true)
    }
  }

  async callAPIBundle(isNewShare: boolean) {
    if (!this.firstToken || !this.secondToken) return;
    if (!this.lbFirstPrice.isConnected) await this.lbFirstPrice.ready();
    if (!this.lbSecondPrice.isConnected) await this.lbSecondPrice.ready();
    if (!this.lbShareOfPool.isConnected) await this.lbShareOfPool.ready();
    if (this.isFixedPair) {
      const info = await getRemoveLiquidityInfo(this.firstToken, this.secondToken);
      this.removeInfo = {
        maxBalance: info?.totalPoolTokens || '',
        totalPoolTokens: info.totalPoolTokens ? formatNumber(info.totalPoolTokens, 4) : '',
        poolShare: info.poolShare ? `${formatNumber(new BigNumber(info.poolShare).times(100), 2)}%` : '',
        tokenAShare: info.tokenAShare ? formatNumber(info.tokenAShare, 4) : '',
        tokenBShare: info.tokenBShare ? formatNumber(info.tokenBShare, 4) : ''
      }
      this.lbFirstPrice.caption = `1 ${this.firstTokenSymbol} = ${formatNumber(info.price0, 4)} ${this.secondTokenSymbol}`;
      this.lbSecondPrice.caption = `1 ${this.secondTokenSymbol} = ${formatNumber(info.price1, 4)} ${this.firstTokenSymbol}`;
      this.lbShareOfPool.caption = this.removeInfo.poolShare;
      this.firstInput.value = this.removeInfo.tokenAShare;
      this.secondInput.value = this.removeInfo.tokenBShare;
      this.lbLiquidityBalance.caption = `Balance: ${this.removeInfo.totalPoolTokens}`;
      this.liquidityInput.value = this.removeInfo.totalPoolTokens;
      this.maxLiquidityBalance = info.totalPoolTokens;
      this.lpToken = info.lpToken;
      return;
    }

    if (isNewShare) {
      let newShareInfo;
      let invalidVal = false;
      if (this.isFromEstimated) {
        invalidVal = new BigNumber(this.firstInput.value).isNaN();
        newShareInfo = await getNewShareInfo(this.secondToken, this.firstToken, this.secondInput.value, this.firstInput.value, this.secondInput.value);
        const val = limitDecimals(newShareInfo?.quote || '0', this.firstTokenDecimals);
        this.firstInputAmount = val;
        this.firstInput.value = val;
        if (invalidVal)
          newShareInfo = await getNewShareInfo(this.secondToken, this.firstToken, this.secondInput.value, this.firstInput.value, this.secondInput.value);
      }
      else {
        invalidVal = new BigNumber(this.secondInput.value).isNaN();
        newShareInfo = await getNewShareInfo(this.firstToken, this.secondToken, this.firstInput.value, this.firstInput.value, this.secondInput.value);
        const val = limitDecimals(newShareInfo?.quote || '0', this.secondTokenDecimals);
        this.secondInputAmount = val;
        this.secondInput.value = val;
        if (invalidVal)
          newShareInfo = await getNewShareInfo(this.firstToken, this.secondToken, this.firstInput.value, this.firstInput.value, this.secondInput.value);
      }
      if (!newShareInfo) {
        this.lbFirstPrice.caption = '0';
        this.lbSecondPrice.caption = '0';
        this.lbShareOfPool.caption = '0%';
        this.poolTokenAmount = '0';
      }
      else {
        let shareOfPool = new BigNumber(newShareInfo.newShare).times(100).toFixed();
        this.lbFirstPrice.caption = formatNumber(newShareInfo.newPrice0, 3);
        this.lbSecondPrice.caption = formatNumber(newShareInfo.newPrice1, 3);
        this.lbShareOfPool.caption = `${formatNumber(shareOfPool, 2)}%`;
        this.poolTokenAmount = newShareInfo.minted;
      }
    }
    else {
      let pricesInfo = await getPricesInfo(this.firstToken, this.secondToken);
      if (!pricesInfo) {
        let newPairShareInfo = calculateNewPairShareInfo(this.firstToken, this.secondToken, this.firstInputAmount, this.secondInputAmount);
        this.lbFirstPrice.caption = formatNumber(newPairShareInfo.price0, 3);
        this.lbSecondPrice.caption = formatNumber(newPairShareInfo.price1, 3);
        this.poolTokenAmount = newPairShareInfo.minted;
        this.lbShareOfPool.caption = '100%';
      }
      else if (!pricesInfo.price0 || !pricesInfo.price1) {
        this.lbFirstPrice.caption = '0';
        this.lbSecondPrice.caption = '0';
        this.lbShareOfPool.caption = '0%';
      }
      else {
        const { price0, price1 } = pricesInfo;
        let shareOfPool = pricesInfo.totalSupply == '0' ? '0' : new BigNumber(pricesInfo.balance).div(pricesInfo.totalSupply).times(100).toFixed();
        this.lbFirstPrice.caption = formatNumber(price0, 3);
        this.lbSecondPrice.caption = formatNumber(price1, 3);
        this.lbShareOfPool.caption = `${formatNumber(shareOfPool, 2)}%`;
        if (this.isFromEstimated) {
          if (new BigNumber(this.secondInput.value).gt(0)) {
            const price = new BigNumber(price1).multipliedBy(this.secondInput.value).toFixed();
            const val = limitDecimals(price, this.firstTokenDecimals);
            this.firstInput.value = val;
            this.firstInputAmount = val;
          }
        } else {
          if (new BigNumber(this.firstInput.value).gt(0)) {
            const price = new BigNumber(price0).multipliedBy(this.firstInput.value).toFixed();
            const val = limitDecimals(price, this.secondTokenDecimals);
            this.secondInput.value = val;
            this.secondInputAmount = val;
          }
        }
      }
    }
    this.btnSupply.enabled = true;
    this.approvalModelAction.checkAllowance(this.firstToken, this.firstInputAmount);
    this.approvalModelAction.checkAllowance(this.secondToken, this.secondInputAmount);
  }

  async init() {
    this.isReadyCallbackQueued = true;
    super.init();
    const mode = this.getAttribute('mode', true);
    const tokens = this.getAttribute('tokens', true, []);
    const defaultChainId = this.getAttribute('defaultChainId', true);
    const networks = this.getAttribute('networks', true);
    const wallets = this.getAttribute('wallets', true);
    const providers = this.getAttribute('providers', true, []);
    await this.setData({mode, providers, tokens, defaultChainId, networks, wallets});
    this.isReadyCallbackQueued = false;
    this.executeReadyCallback();
  }

  toggleCreateMessage(value: boolean){
    this.pnlCreatePairMsg.visible = value;
  }

  private showResultMessage = (result: Result, status: 'warning' | 'success' | 'error', content?: string | Error) => {
    if (!result) return;
    let params: any = { status };
    if (status === 'success') {
      params.txtHash = content;
    } else {
      params.content = content;
    }
    result.message = { ...params };
    result.showModal();
  }

  render() {
    return (
      <i-scom-dapp-container id="dappContainer">
        <i-panel class={poolAddStyle} background={{color: Theme.background.main}}>
          <i-panel
            width="100%"
            padding={{left: '1rem', right: '1rem', top: '1rem', bottom: '1rem'}}
          >
            <i-vstack
              margin={{top: '0.5rem', left: 'auto', right: 'auto', bottom: '0.75rem'}}
              padding={{left: '1rem', right: '1rem', top: '0.75rem', bottom: '0.75rem'}}
              border={{radius: '1rem'}}
              width="100%" maxWidth={520}
              background={{color: Theme.background.modal}}
            >
              <i-panel>
                <i-vstack
                  id="pnlCreatePairMsg" visible={false}
                  background={{color: Theme.background.gradient}}
                  padding={{left: '1rem', right: '1rem', top: '0.75rem', bottom: '0.75rem'}}
                  margin={{bottom: '1rem'}}
                  gap="1rem"
                >
                  <i-label caption='You are the first liquidity provider.' font={{color: '#fff'}} />
                  <i-label caption='The ratio of tokens you add will set the price of this pool.' font={{color: '#fff'}} />
                  <i-label caption='Once you are happy with the rate click supply to review.' font={{color: '#fff'}} />
                </i-vstack>
                <i-vstack id="pnlLiquidity" visible={false}>
                  <i-vstack
                    padding={{top: '1rem', bottom: '1rem', right: '1rem', left: '1rem'}}
                    border={{color: '#E53780', width: '1px', style: 'solid', radius: 12}}
                    margin={{top: 10, bottom: 10}}
                    gap="0.5rem"
                  >
                    <i-hstack horizontalAlignment="space-between" margin={{ bottom: 4 }}>
                      <i-label caption="Input" />
                      <i-label id="lbLiquidityBalance" caption="-" font={{color: Theme.colors.warning.main}} />
                    </i-hstack>
                    <i-hstack horizontalAlignment="space-between">
                      <i-input id="liquidityInput" class="bg-transparent" value="0" onChanged={this.onLiquidityChange} />
                      <i-panel id="pnlLiquidityImage" class="text-right"></i-panel>
                    </i-hstack>
                  </i-vstack>
                  <i-hstack horizontalAlignment="center">
                    <i-icon width={20} height={20} name="arrow-down" fill="#fff" />
                  </i-hstack>
                </i-vstack>
                <i-vstack
                  padding={{top: '1rem', bottom: '1rem', right: '1rem', left: '1rem'}}
                  border={{color: '#E53780', width: '1px', style: 'solid', radius: 12}}
                  margin={{top: 10, bottom: 10}}
                  gap="0.5rem"
                >
                  <i-hstack horizontalAlignment="space-between">
                    <i-label id="lbLabel1" caption='' />
                    <i-label id="lbFirstBalance" font={{color: Theme.colors.warning.main}} caption="-" />
                  </i-hstack>
                  <i-hstack horizontalAlignment="space-between">
                    <i-input id="firstInput" class="bg-transparent" placeholder='0.0' onChanged={this.handleEnterAmount}/>
                    <i-scom-amm-pool-token-selection width="auto" id="firstTokenSelection" />
                  </i-hstack>
                </i-vstack>
                <i-hstack horizontalAlignment="center">
                  <i-icon width={20} height={20} name="plus" fill="#fff" />
                </i-hstack>
                <i-vstack
                  padding={{top: '1rem', bottom: '1rem', right: '1rem', left: '1rem'}}
                  border={{color: '#E53780', width: '1px', style: 'solid', radius: 12}}
                  margin={{top: 10, bottom: 10}}
                  gap="0.5rem"
                >
                  <i-hstack horizontalAlignment="space-between">
                    <i-label id="lbLabel2" caption='' />
                    <i-label id="lbSecondBalance" font={{color: Theme.colors.warning.main}} caption="-" />
                  </i-hstack>
                  <i-hstack horizontalAlignment="space-between">
                    <i-input id="secondInput" class="bg-transparent" placeholder='0.0' onChanged={this.handleEnterAmount} />
                    <i-scom-amm-pool-token-selection width="auto" id="secondTokenSelection" />
                  </i-hstack>
                </i-vstack>
                <i-vstack
                  id="pricePanel"
                  padding={{top: '1rem', bottom: '1rem', right: '1rem', left: '1rem'}}
                  border={{color: '#E53780', width: '1px', style: 'solid', radius: 12}}
                  margin={{top: 10, bottom: 10}}
                  gap="0.5rem"
                  visible={false}
                >
                  <i-label margin={{ bottom: 12 }} caption="Prices and pool share" />
                  <i-hstack horizontalAlignment="space-between" verticalAlignment="center">
                    <i-panel>
                      <i-panel class="text-center">
                        <i-label id="lbFirstPrice" caption="-" />
                      </i-panel>
                      <i-panel class="text-center">
                        <i-label id="lbFirstPriceTitle" opacity={0.7} caption="per" />
                      </i-panel>
                    </i-panel>
                    <i-panel>
                      <i-panel class="text-center">
                        <i-label id="lbSecondPrice" caption="-" />
                      </i-panel>
                      <i-panel class="text-center">
                        <i-label id="lbSecondPriceTitle" opacity={0.7} caption="per" />
                      </i-panel>
                    </i-panel>
                    <i-panel>
                      <i-panel class="text-center">
                        <i-label id="lbShareOfPool" caption="0%" />
                      </i-panel>
                      <i-panel class="text-center">
                        <i-label opacity={0.7} caption="Share of pool" />
                      </i-panel>
                    </i-panel>
                  </i-hstack>
                </i-vstack>
                <i-button
                  id="btnApproveFirstToken" visible={false}
                  class="btn-swap" height="65"
                  caption="Approve"
                  rightIcon={{ spin: true, visible: false }}
                  onClick={this.handleApprove}
                ></i-button>
                <i-button
                  id="btnApproveSecondToken" visible={false} class="btn-swap" height="65" caption="Approve"
                  onClick={this.handleApprove}
                  rightIcon={{ spin: true, visible: false }}
                ></i-button>
                <i-button
                  id="btnSupply" class="btn-swap" enabled={false} height="65" caption=''
                  rightIcon={{ spin: true, visible: false }}
                  onClick={this.handleAction}
                ></i-button>
                <i-vstack id="pnlInfo"></i-vstack>
              </i-panel>
            </i-vstack>
            <i-modal id="confirmSupplyModal" title="Add Liquidity To Pool" closeIcon={{ name: 'times' }}>
              <i-label font={{color: Theme.colors.warning.main, size: '1.125rem'}} caption='You will receive' />
              <i-hstack horizontalAlignment="space-between" margin={{ bottom: 24 }}>
                <i-label id="lbPoolTokenAmount" font={{color: Theme.colors.warning.main, size: '1.5rem'}} caption='-' />
                <i-panel>
                  <i-image id="firstTokenImage1" margin={{right: '-0.5rem'}} zIndex={1} width={24} height={24} />
                  <i-image id="secondTokenImage1" width={24} height={24} />
                </i-panel>
              </i-hstack>
              <i-label id="lbPoolTokensTitle" font={{color: Theme.colors.warning.main}} />
              <i-label id="lbOutputEstimated" font={{color: Theme.colors.warning.main, size: '0.75rem'}} />
              <i-hstack horizontalAlignment="space-between">
                <i-label id="lbFirstDeposited" font={{color: Theme.colors.warning.main}} />
                <i-hstack verticalAlignment="center">
                  <i-image id="firstTokenImage2" margin={{ right: 4 }} width={24} height={24} />
                  <i-label id="lbFirstInput" font={{color: Theme.colors.warning.main}} />
                </i-hstack>
              </i-hstack>
              <i-hstack horizontalAlignment="space-between">
                <i-label id="lbSecondDeposited" font={{color: Theme.colors.warning.main}} />
                <i-hstack verticalAlignment="center">
                  <i-image id="secondTokenImage2" margin={{ right: 4 }} width={24} height={24} />
                  <i-label id="lbSecondInput" font={{color: Theme.colors.warning.main}} />
                </i-hstack>
              </i-hstack>
              <i-hstack horizontalAlignment="space-between">
                <i-label font={{color: Theme.colors.warning.main}} caption="Rates" />
                <i-panel>
                  <i-panel class="text-right">
                    <i-label id="lbSummaryFirstPrice" font={{color: Theme.colors.warning.main}} />
                  </i-panel>
                  <i-panel class="text-right">
                    <i-label id="lbSummarySecondPrice" font={{color: Theme.colors.warning.main}} />
                  </i-panel>
                </i-panel>
              </i-hstack>
              <i-hstack horizontalAlignment="space-between">
                <i-label font={{color: Theme.colors.warning.main}} caption="Share of Pool" />
                <i-panel>
                  <i-label id="lbShareOfPool2" font={{color: Theme.colors.warning.main}} />
                </i-panel>
              </i-hstack>
              <i-button class="btn-swap" height="auto" caption="Confirm Supply" onClick={this.handleConfirmSupply} />
            </i-modal>
          </i-panel>
          <i-scom-amm-pool-result id="resultEl"></i-scom-amm-pool-result>
        </i-panel>
      </i-scom-dapp-container>
    )
  }
}