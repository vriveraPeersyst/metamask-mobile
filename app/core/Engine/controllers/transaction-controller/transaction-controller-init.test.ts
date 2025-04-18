import {
  TransactionController,
  TransactionControllerMessenger,
  TransactionControllerOptions,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller/dist/types';
import { NetworkController } from '@metamask/network-controller';

import { selectSwapsChainFeatureFlags } from '../../../../reducers/swaps';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import { getGlobalChainId } from '../../../../util/networks/global-network';
import { submitSmartTransactionHook } from '../../../../util/smart-transactions/smart-publish-hook';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { TransactionControllerInitMessenger } from '../../messengers/transaction-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { TransactionControllerInit } from './transaction-controller-init';
import {
  handleTransactionAdded,
  handleTransactionApproved,
  handleTransactionConfirmed,
  handleTransactionDropped,
  handleTransactionFailed,
  handleTransactionRejected,
  handleTransactionSubmitted,
} from './transaction-event-handlers';

jest.mock('@metamask/transaction-controller');
jest.mock('../../../../reducers/swaps');
jest.mock('../../../../selectors/smartTransactionsController');
jest.mock('../../../../util/networks/global-network');
jest.mock('../../../../util/smart-transactions/smart-publish-hook');
jest.mock('./transaction-event-handlers');

/**
 * Build a mock NetworkController.
 *
 * @param partialMock - A partial mock object for the NetworkController, merged
 * with the default mock.
 * @returns A mock NetworkController.
 */
function buildControllerMock(
  partialMock?: Partial<NetworkController>,
): NetworkController {
  const defaultControllerMocks = {};

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test.
  return {
    ...defaultControllerMocks,
    ...partialMock,
  };
}

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<
  ControllerInitRequest<
    // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
    TransactionControllerMessenger,
    TransactionControllerInitMessenger
  >
> {
  const initMessenger = new ExtendedControllerMessenger();
  const baseControllerMessenger = new ExtendedControllerMessenger();
  const requestMock = {
    ...buildControllerInitRequestMock(baseControllerMessenger),
    initMessenger:
      initMessenger as unknown as TransactionControllerInitMessenger,
    controllerMessenger:
      baseControllerMessenger as unknown as TransactionControllerMessenger,
    ...initRequestProperties,
  };

  if (!initRequestProperties.getController) {
    requestMock.getController.mockReturnValue(buildControllerMock());
  }

  return requestMock;
}

describe('Transaction Controller Init', () => {
  const transactionControllerClassMock = jest.mocked(TransactionController);
  const selectShouldUseSmartTransactionMock = jest.mocked(
    selectShouldUseSmartTransaction,
  );
  const submitSmartTransactionHookMock = jest.mocked(
    submitSmartTransactionHook,
  );
  const selectSwapsChainFeatureFlagsMock = jest.mocked(
    selectSwapsChainFeatureFlags,
  );
  const getGlobalChainIdMock = jest.mocked(getGlobalChainId);
  const handleTransactionApprovedMock = jest.mocked(handleTransactionApproved);
  const handleTransactionConfirmedMock = jest.mocked(
    handleTransactionConfirmed,
  );
  const handleTransactionDroppedMock = jest.mocked(handleTransactionDropped);
  const handleTransactionFailedMock = jest.mocked(handleTransactionFailed);
  const handleTransactionRejectedMock = jest.mocked(handleTransactionRejected);
  const handleTransactionSubmittedMock = jest.mocked(
    handleTransactionSubmitted,
  );
  const handleTransactionAddedMock = jest.mocked(handleTransactionAdded);

  /**
   * Extract a constructor option passed to the controller.
   *
   * @param option - The option to extract.
   * @param dependencyProperties - Any properties required on the controller dependencies.
   * @returns The extracted option.
   */
  function testConstructorOption<T extends keyof TransactionControllerOptions>(
    option: T,
    dependencyProperties: Record<string, unknown> = {},
    initRequestProperties: Record<string, unknown> = {},
  ): TransactionControllerOptions[T] {
    const requestMock = buildInitRequestMock(initRequestProperties);

    requestMock.getController.mockReturnValue(
      buildControllerMock(dependencyProperties),
    );

    TransactionControllerInit(requestMock);

    return transactionControllerClassMock.mock.calls[0][0][option];
  }

  beforeEach(() => {
    jest.resetAllMocks();
    selectShouldUseSmartTransactionMock.mockReturnValue(true);
    selectSwapsChainFeatureFlagsMock.mockReturnValue({});
    getGlobalChainIdMock.mockReturnValue('0x1');
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(TransactionControllerInit(requestMock).controller).toBeInstanceOf(
      TransactionController,
    );
  });

  it('initialize with correct state', () => {
    const MOCK_TRANSACTION_CONTROLLER_STATE = {
      transactions: [],
    };
    const state = testConstructorOption('state', undefined, {
      persistedState: {
        TransactionController: MOCK_TRANSACTION_CONTROLLER_STATE,
      },
    });

    expect(state).toBe(MOCK_TRANSACTION_CONTROLLER_STATE);
  });

  describe('throws error', () => {
    it('if requested controller is not found', () => {
      const requestMock = buildInitRequestMock({
        getController: () => {
          throw new Error('Controller not found');
        },
      });
      expect(() => TransactionControllerInit(requestMock)).toThrow(
        'Controller not found',
      );
    });

    it('if controller initialisation fails', () => {
      transactionControllerClassMock.mockImplementationOnce(() => {
        throw new Error('Controller initialisation failed');
      });
      const requestMock = buildInitRequestMock();

      expect(() => TransactionControllerInit(requestMock)).toThrow(
        'Controller initialisation failed',
      );
    });
  });

  it.each([
    [
      'networkController',
      'getEIP1559Compatibility',
      'getCurrentNetworkEIP1559Compatibility',
    ],
    ['gasFeeController', 'fetchGasFeeEstimates', 'getGasFeeEstimates'],
    [
      'networkController',
      'getNetworkClientRegistry',
      'getNetworkClientRegistry',
    ],
    ['keyringController', 'signTransaction', 'sign'],
  ])('calls %s.%s on option %s', (_controller, method, option) => {
    const mock = jest.fn();

    const optionFn = testConstructorOption(
      option as keyof TransactionControllerOptions,
      {
        [method]: mock,
      },
    ) as unknown as () => void;

    optionFn();

    expect(mock).toHaveBeenCalled();
  });

  it('calls smartTransactionsController.getTransactions on option getExternalPendingTransactions', () => {
    const MOCK_STX = [{ id: '123' }];
    const MOCK_ADDRESS = '0x123';
    const getTransactionsMock = jest.fn().mockReturnValue(MOCK_STX);

    const optionFn = testConstructorOption('getExternalPendingTransactions', {
      getTransactions: getTransactionsMock,
    });

    optionFn?.(MOCK_ADDRESS);

    expect(getTransactionsMock).toHaveBeenCalledWith({
      addressFrom: MOCK_ADDRESS,
      status: SmartTransactionStatuses.PENDING,
    });
  });

  it('determines if simulation enabled using preference', () => {
    const optionFn = testConstructorOption('isSimulationEnabled', {
      state: {
        useTransactionSimulations: true,
      },
    });

    expect(optionFn?.()).toBe(true);
  });

  it('determines if resubmit enabled for pending transactions', () => {
    const optionFn = testConstructorOption(
      'pendingTransactions',
    )?.isResubmitEnabled;

    expect(optionFn?.()).toBe(false);
  });

  it('publish hook calls submitSmartTransactionHook', () => {
    const MOCK_TRANSACTION_META = {
      id: '123',
    } as TransactionMeta;

    const hooks = testConstructorOption('hooks');

    hooks?.publish?.(MOCK_TRANSACTION_META);

    expect(submitSmartTransactionHookMock).toHaveBeenCalledTimes(1);
    expect(selectShouldUseSmartTransactionMock).toHaveBeenCalledTimes(1);
    expect(selectSwapsChainFeatureFlagsMock).toHaveBeenCalledTimes(1);
    expect(submitSmartTransactionHookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionMeta: MOCK_TRANSACTION_META,
        shouldUseSmartTransaction: true,
      }),
    );
  });

  it('determines incoming transactions based on preferences', () => {
    const MOCK_CHAIN_ID = '0x1';
    const option = testConstructorOption(
      'incomingTransactions',
      {
        state: {
          showIncomingTransactions: {
            [MOCK_CHAIN_ID]: true,
          },
        },
      },
      {
        getGlobalChainId: () => MOCK_CHAIN_ID,
      },
    );

    const isEnabledFn = option?.isEnabled;
    const updateTransactionsProp = option?.updateTransactions;

    expect(isEnabledFn?.()).toBe(true);
    expect(updateTransactionsProp).toBe(true);
  });

  it('gets network state from network controller on option getNetworkState', () => {
    const MOCK_NETWORK_STATE = {
      chainId: '0x1',
    };
    const option = testConstructorOption('getNetworkState', {
      state: {
        ...MOCK_NETWORK_STATE,
      },
    });

    expect(option?.()).toStrictEqual(MOCK_NETWORK_STATE);
  });

  it('calls appropriate handlers when transaction events are triggered', () => {
    const mockSubscribe = jest.fn();
    const subscribeCallbacks: Record<string, (...args: unknown[]) => void> = {};

    mockSubscribe.mockImplementation((eventName, callback) => {
      subscribeCallbacks[eventName] = callback;
    });

    const requestMock = buildInitRequestMock({
      initMessenger: {
        subscribe: mockSubscribe,
      },
      getState: () => ({ confirmationMetrics: { metricsById: {} } }),
    });

    TransactionControllerInit(requestMock);

    // Verify all events are subscribed
    expect(Object.keys(subscribeCallbacks).length).toBe(7);

    const mockTransactionMeta = {
      id: '123',
      status: 'approved',
    } as TransactionMeta;

    subscribeCallbacks['TransactionController:transactionApproved']({
      transactionMeta: mockTransactionMeta,
    });

    expect(handleTransactionApprovedMock).toHaveBeenCalledWith(
      mockTransactionMeta,
      expect.objectContaining({
        getTransactionMetricProperties: expect.any(Function),
      }),
    );

    subscribeCallbacks['TransactionController:transactionConfirmed'](
      mockTransactionMeta,
    );
    expect(handleTransactionConfirmedMock).toHaveBeenCalledWith(
      mockTransactionMeta,
      expect.objectContaining({
        getTransactionMetricProperties: expect.any(Function),
      }),
    );

    subscribeCallbacks['TransactionController:transactionDropped']({
      transactionMeta: mockTransactionMeta,
    });
    expect(handleTransactionDroppedMock).toHaveBeenCalled();

    subscribeCallbacks['TransactionController:transactionFailed']({
      transactionMeta: mockTransactionMeta,
    });
    expect(handleTransactionFailedMock).toHaveBeenCalled();

    subscribeCallbacks['TransactionController:transactionRejected']({
      transactionMeta: mockTransactionMeta,
    });
    expect(handleTransactionRejectedMock).toHaveBeenCalled();

    subscribeCallbacks['TransactionController:transactionSubmitted']({
      transactionMeta: mockTransactionMeta,
    });
    expect(handleTransactionSubmittedMock).toHaveBeenCalled();

    subscribeCallbacks['TransactionController:unapprovedTransactionAdded'](
      mockTransactionMeta,
    );
    expect(handleTransactionAddedMock).toHaveBeenCalled();
  });
});
