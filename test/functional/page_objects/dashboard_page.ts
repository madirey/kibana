/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const PIE_CHART_VIS_NAME = 'Visualization PieChart';
export const AREA_CHART_VIS_NAME = 'Visualization漢字 AreaChart';
export const LINE_CHART_VIS_NAME = 'Visualization漢字 LineChart';
import { FtrProviderContext } from '../ftr_provider_context';

export function DashboardPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const find = getService('find');
  const retry = getService('retry');
  const browser = getService('browser');
  const globalNav = getService('globalNav');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const renderable = getService('renderable');
  const listingTable = getService('listingTable');
  const elasticChart = getService('elasticChart');
  const PageObjects = getPageObjects(['common', 'header', 'visualize', 'discover']);

  interface SaveDashboardOptions {
    /**
     * @default true
     */
    waitDialogIsClosed?: boolean;
    exitFromEditMode?: boolean;
    needsConfirm?: boolean;
    storeTimeWithDashboard?: boolean;
    saveAsNew?: boolean;
    tags?: string[];
  }

  class DashboardPage {
    async initTests({ kibanaIndex = 'dashboard/legacy', defaultIndex = 'logstash-*' } = {}) {
      log.debug('load kibana index with visualizations and log data');
      await esArchiver.load(kibanaIndex);
      await kibanaServer.uiSettings.replace({ defaultIndex });
      await PageObjects.common.navigateToApp('dashboard');
    }

    public async preserveCrossAppState() {
      const url = await browser.getCurrentUrl();
      await browser.get(url, false);
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    public async clickFullScreenMode() {
      log.debug(`clickFullScreenMode`);
      await testSubjects.click('dashboardFullScreenMode');
      await testSubjects.exists('exitFullScreenModeLogo');
      await this.waitForRenderComplete();
    }

    public async exitFullScreenMode() {
      log.debug(`exitFullScreenMode`);
      const logoButton = await this.getExitFullScreenLogoButton();
      await logoButton.moveMouseTo();
      await this.clickExitFullScreenTextButton();
    }

    public async fullScreenModeMenuItemExists() {
      return await testSubjects.exists('dashboardFullScreenMode');
    }

    public async exitFullScreenTextButtonExists() {
      return await testSubjects.exists('exitFullScreenModeText');
    }

    public async getExitFullScreenTextButton() {
      return await testSubjects.find('exitFullScreenModeText');
    }

    public async exitFullScreenLogoButtonExists() {
      return await testSubjects.exists('exitFullScreenModeLogo');
    }

    public async getExitFullScreenLogoButton() {
      return await testSubjects.find('exitFullScreenModeLogo');
    }

    public async clickExitFullScreenLogoButton() {
      await testSubjects.click('exitFullScreenModeLogo');
      await this.waitForRenderComplete();
    }

    public async clickExitFullScreenTextButton() {
      await testSubjects.click('exitFullScreenModeText');
      await this.waitForRenderComplete();
    }

    public async getDashboardIdFromCurrentUrl() {
      const currentUrl = await browser.getCurrentUrl();
      const id = this.getDashboardIdFromUrl(currentUrl);

      log.debug(`Dashboard id extracted from ${currentUrl} is ${id}`);

      return id;
    }

    public getDashboardIdFromUrl(url: string) {
      const urlSubstring = '#/view/';
      const startOfIdIndex = url.indexOf(urlSubstring) + urlSubstring.length;
      const endIndex = url.indexOf('?');
      const id = url.substring(startOfIdIndex, endIndex < 0 ? url.length : endIndex);
      return id;
    }

    public async expectUnsavedChangesListingExists(title: string) {
      log.debug(`Expect Unsaved Changes Listing Exists for `, title);
      await testSubjects.existOrFail(`edit-unsaved-${title.split(' ').join('-')}`);
    }

    public async expectUnsavedChangesDoesNotExist(title: string) {
      log.debug(`Expect Unsaved Changes Listing Does Not Exist for `, title);
      await testSubjects.missingOrFail(`edit-unsaved-${title.split(' ').join('-')}`);
    }

    public async clickUnsavedChangesContinueEditing(title: string) {
      log.debug(`Click Unsaved Changes Continue Editing `, title);
      await testSubjects.existOrFail(`edit-unsaved-${title.split(' ').join('-')}`);
      await testSubjects.click(`edit-unsaved-${title.split(' ').join('-')}`);
    }

    public async clickUnsavedChangesDiscard(title: string, confirmDiscard = true) {
      log.debug(`Click Unsaved Changes Discard for `, title);
      await testSubjects.existOrFail(`discard-unsaved-${title.split(' ').join('-')}`);
      await testSubjects.click(`discard-unsaved-${title.split(' ').join('-')}`);
      if (confirmDiscard) {
        await PageObjects.common.clickConfirmOnModal();
      } else {
        await PageObjects.common.clickCancelOnModal();
      }
    }

    /**
     * Returns true if already on the dashboard landing page (that page doesn't have a link to itself).
     * @returns {Promise<boolean>}
     */
    public async onDashboardLandingPage() {
      log.debug(`onDashboardLandingPage`);
      return await listingTable.onListingPage('dashboard');
    }

    public async expectExistsDashboardLandingPage() {
      log.debug(`expectExistsDashboardLandingPage`);
      await testSubjects.existOrFail('dashboardLandingPage');
    }

    public async clickDashboardBreadcrumbLink() {
      log.debug('clickDashboardBreadcrumbLink');
      await testSubjects.click('breadcrumb dashboardListingBreadcrumb first');
    }

    public async expectOnDashboard(dashboardTitle: string) {
      await retry.waitFor(
        'last breadcrumb to have dashboard title',
        async () => (await globalNav.getLastBreadcrumb()) === dashboardTitle
      );
    }

    public async gotoDashboardLandingPage(ignorePageLeaveWarning = true) {
      log.debug('gotoDashboardLandingPage');
      const onPage = await this.onDashboardLandingPage();
      if (!onPage) {
        await this.clickDashboardBreadcrumbLink();
        await retry.try(async () => {
          const warning = await testSubjects.exists('confirmModalTitleText');
          if (warning) {
            await testSubjects.click(
              ignorePageLeaveWarning ? 'confirmModalConfirmButton' : 'confirmModalCancelButton'
            );
          }
        });
        await this.expectExistsDashboardLandingPage();
      }
    }

    public async clickClone() {
      log.debug('Clicking clone');
      await testSubjects.click('dashboardClone');
    }

    public async getCloneTitle() {
      return await testSubjects.getAttribute('clonedDashboardTitle', 'value');
    }

    public async confirmClone() {
      log.debug('Confirming clone');
      await testSubjects.click('cloneConfirmButton');
    }

    public async cancelClone() {
      log.debug('Canceling clone');
      await testSubjects.click('cloneCancelButton');
    }

    public async setClonedDashboardTitle(title: string) {
      await testSubjects.setValue('clonedDashboardTitle', title);
    }

    /**
     * Asserts that the duplicate title warning is either displayed or not displayed.
     * @param { displayed: boolean }
     */
    public async expectDuplicateTitleWarningDisplayed({ displayed = true }) {
      if (displayed) {
        await testSubjects.existOrFail('titleDupicateWarnMsg');
      } else {
        await testSubjects.missingOrFail('titleDupicateWarnMsg');
      }
    }

    /**
     * Asserts that the toolbar pagination (count and arrows) is either displayed or not displayed.

     */
    public async expectToolbarPaginationDisplayed() {
      const isLegacyDefault = PageObjects.discover.useLegacyTable();
      if (isLegacyDefault) {
        const subjects = ['btnPrevPage', 'btnNextPage', 'toolBarPagerText'];
        await Promise.all(subjects.map(async (subj) => await testSubjects.existOrFail(subj)));
      } else {
        const subjects = ['pagination-button-previous', 'pagination-button-next'];

        await Promise.all(subjects.map(async (subj) => await testSubjects.existOrFail(subj)));
        const paginationListExists = await find.existsByCssSelector('.euiPagination__list');
        if (!paginationListExists) {
          throw new Error(`expected discover data grid pagination list to exist`);
        }
      }
    }

    public async switchToEditMode() {
      log.debug('Switching to edit mode');
      await testSubjects.click('dashboardEditMode');
      // wait until the count of dashboard panels equals the count of toggle menu icons
      await retry.waitFor('in edit mode', async () => {
        const panels = await testSubjects.findAll('embeddablePanel', 2500);
        const menuIcons = await testSubjects.findAll('embeddablePanelToggleMenuIcon', 2500);
        return panels.length === menuIcons.length;
      });
    }

    public async getIsInViewMode() {
      log.debug('getIsInViewMode');
      return await testSubjects.exists('dashboardEditMode');
    }

    public async clickCancelOutOfEditMode(accept = true) {
      log.debug('clickCancelOutOfEditMode');
      await testSubjects.click('dashboardViewOnlyMode');
      if (accept) {
        const confirmation = await testSubjects.exists('dashboardDiscardConfirmKeep');
        if (confirmation) {
          await testSubjects.click('dashboardDiscardConfirmKeep');
        }
      }
    }

    public async clickDiscardChanges(accept = true) {
      log.debug('clickDiscardChanges');
      await testSubjects.click('dashboardViewOnlyMode');
      if (accept) {
        const confirmation = await testSubjects.exists('dashboardDiscardConfirmDiscard');
        if (confirmation) {
          await testSubjects.click('dashboardDiscardConfirmDiscard');
        }
      }
    }

    public async clickQuickSave() {
      log.debug('clickQuickSave');
      await testSubjects.click('dashboardQuickSaveMenuItem');
    }

    public async clickNewDashboard(continueEditing = false) {
      await listingTable.clickNewButton('createDashboardPromptButton');
      if (await testSubjects.exists('dashboardCreateConfirm')) {
        if (continueEditing) {
          await testSubjects.click('dashboardCreateConfirmContinue');
        } else {
          await testSubjects.click('dashboardCreateConfirmStartOver');
        }
      }
      // make sure the dashboard page is shown
      await this.waitForRenderComplete();
    }

    public async clickNewDashboardExpectWarning(continueEditing = false) {
      await listingTable.clickNewButton('createDashboardPromptButton');
      await testSubjects.existOrFail('dashboardCreateConfirm');
      if (continueEditing) {
        await testSubjects.click('dashboardCreateConfirmContinue');
      } else {
        await testSubjects.click('dashboardCreateConfirmStartOver');
      }
      // make sure the dashboard page is shown
      await this.waitForRenderComplete();
    }

    public async clickCreateDashboardPrompt() {
      await testSubjects.click('createDashboardPromptButton');
    }

    public async getCreateDashboardPromptExists() {
      return await testSubjects.exists('createDashboardPromptButton');
    }

    public async isOptionsOpen() {
      log.debug('isOptionsOpen');
      return await testSubjects.exists('dashboardOptionsMenu');
    }

    public async openOptions() {
      log.debug('openOptions');
      const isOpen = await this.isOptionsOpen();
      if (!isOpen) {
        return await testSubjects.click('dashboardOptionsButton');
      }
    }

    // avoids any 'Object with id x not found' errors when switching tests.
    public async clearSavedObjectsFromAppLinks() {
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await this.gotoDashboardLandingPage();
    }

    public async isMarginsOn() {
      log.debug('isMarginsOn');
      await this.openOptions();
      return await testSubjects.getAttribute('dashboardMarginsCheckbox', 'checked');
    }

    public async useMargins(on = true) {
      await this.openOptions();
      const isMarginsOn = await this.isMarginsOn();
      if (isMarginsOn !== 'on') {
        return await testSubjects.click('dashboardMarginsCheckbox');
      }
    }

    public async isColorSyncOn() {
      log.debug('isColorSyncOn');
      await this.openOptions();
      return await testSubjects.getAttribute('dashboardSyncColorsCheckbox', 'checked');
    }

    public async useColorSync(on = true) {
      await this.openOptions();
      const isColorSyncOn = await this.isColorSyncOn();
      if (isColorSyncOn !== 'on') {
        return await testSubjects.click('dashboardSyncColorsCheckbox');
      }
    }

    public async gotoDashboardEditMode(dashboardName: string) {
      await this.loadSavedDashboard(dashboardName);
      await this.switchToEditMode();
    }

    public async renameDashboard(dashboardName: string) {
      log.debug(`Naming dashboard ` + dashboardName);
      await testSubjects.click('dashboardRenameButton');
      await testSubjects.setValue('savedObjectTitle', dashboardName);
    }

    /**
     * Save the current dashboard with the specified name and options and
     * verify that the save was successful, close the toast and return the
     * toast message
     *
     * @param dashboardName {String}
     * @param saveOptions {{storeTimeWithDashboard: boolean, saveAsNew: boolean, needsConfirm: false,  waitDialogIsClosed: boolean }}
     */
    public async saveDashboard(
      dashboardName: string,
      saveOptions: SaveDashboardOptions = { waitDialogIsClosed: true, exitFromEditMode: true }
    ) {
      await retry.try(async () => {
        await this.enterDashboardTitleAndClickSave(dashboardName, saveOptions);

        if (saveOptions.needsConfirm) {
          await this.ensureDuplicateTitleCallout();
          await this.clickSave();
        }

        // Confirm that the Dashboard has actually been saved
        await testSubjects.existOrFail('saveDashboardSuccess');
      });
      const message = await PageObjects.common.closeToast();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.waitForSaveModalToClose();

      const isInViewMode = await testSubjects.exists('dashboardEditMode');
      if (saveOptions.exitFromEditMode && !isInViewMode) {
        await this.clickCancelOutOfEditMode();
      }
      await PageObjects.header.waitUntilLoadingHasFinished();

      return message;
    }

    public async cancelSave() {
      log.debug('Canceling save');
      await testSubjects.click('saveCancelButton');
    }

    public async clickSave() {
      log.debug('DashboardPage.clickSave');
      await testSubjects.click('confirmSaveSavedObjectButton');
    }

    /**
     *
     * @param dashboardTitle {String}
     * @param saveOptions {{storeTimeWithDashboard: boolean, saveAsNew: boolean, waitDialogIsClosed: boolean}}
     */
    public async enterDashboardTitleAndClickSave(
      dashboardTitle: string,
      saveOptions: SaveDashboardOptions = { waitDialogIsClosed: true }
    ) {
      await testSubjects.click('dashboardSaveMenuItem');
      const modalDialog = await testSubjects.find('savedObjectSaveModal');

      log.debug('entering new title');
      await testSubjects.setValue('savedObjectTitle', dashboardTitle);

      if (saveOptions.storeTimeWithDashboard !== undefined) {
        await this.setStoreTimeWithDashboard(saveOptions.storeTimeWithDashboard);
      }

      const saveAsNewCheckboxExists = await testSubjects.exists('saveAsNewCheckbox');
      if (saveAsNewCheckboxExists) {
        await this.setSaveAsNewCheckBox(Boolean(saveOptions.saveAsNew));
      }

      if (saveOptions.tags) {
        await this.selectDashboardTags(saveOptions.tags);
      }

      await this.clickSave();
      if (saveOptions.waitDialogIsClosed) {
        await testSubjects.waitForDeleted(modalDialog);
      }
    }

    public async ensureDuplicateTitleCallout() {
      await testSubjects.existOrFail('titleDupicateWarnMsg');
    }

    public async selectDashboardTags(tagNames: string[]) {
      await testSubjects.click('savedObjectTagSelector');
      for (const tagName of tagNames) {
        await testSubjects.click(`tagSelectorOption-${tagName.replace(' ', '_')}`);
      }
      await testSubjects.click('savedObjectTitle');
    }

    /**
     * @param dashboardTitle {String}
     */
    public async enterDashboardTitleAndPressEnter(dashboardTitle: string) {
      await testSubjects.click('dashboardSaveMenuItem');
      const modalDialog = await testSubjects.find('savedObjectSaveModal');

      log.debug('entering new title');
      await testSubjects.setValue('savedObjectTitle', dashboardTitle);

      await PageObjects.common.pressEnterKey();
      await testSubjects.waitForDeleted(modalDialog);
    }

    // use the search filter box to narrow the results down to a single
    // entry, or at least to a single page of results
    public async loadSavedDashboard(dashboardName: string) {
      log.debug(`Load Saved Dashboard ${dashboardName}`);

      await this.gotoDashboardLandingPage();

      await listingTable.searchForItemWithName(dashboardName);
      await retry.try(async () => {
        await listingTable.clickItemLink('dashboard', dashboardName);
        await PageObjects.header.waitUntilLoadingHasFinished();
        // check Dashboard landing page is not present
        await testSubjects.missingOrFail('dashboardLandingPage', { timeout: 10000 });
      });
    }

    public async getPanelTitles() {
      log.debug('in getPanelTitles');
      const titleObjects = await testSubjects.findAll('dashboardPanelTitle');
      return await Promise.all(titleObjects.map(async (title) => await title.getVisibleText()));
    }

    public async getPanelDimensions() {
      const panels = await find.allByCssSelector('.react-grid-item'); // These are gridster-defined elements and classes
      return await Promise.all(
        panels.map(async (panel) => {
          const size = await panel.getSize();
          return {
            width: size.width,
            height: size.height,
          };
        })
      );
    }

    public async getPanelCount() {
      log.debug('getPanelCount');
      const panels = await testSubjects.findAll('embeddablePanel');
      return panels.length;
    }

    public getTestVisualizations() {
      return [
        { name: PIE_CHART_VIS_NAME, description: 'PieChart' },
        { name: 'Visualization☺ VerticalBarChart', description: 'VerticalBarChart' },
        { name: AREA_CHART_VIS_NAME, description: 'AreaChart' },
        { name: 'Visualization☺漢字 DataTable', description: 'DataTable' },
        { name: LINE_CHART_VIS_NAME, description: 'LineChart' },
        { name: 'Visualization TileMap', description: 'TileMap' },
        { name: 'Visualization MetricChart', description: 'MetricChart' },
      ];
    }

    public getTestVisualizationNames() {
      return this.getTestVisualizations().map((visualization) => visualization.name);
    }

    public getTestVisualizationDescriptions() {
      return this.getTestVisualizations().map((visualization) => visualization.description);
    }

    public async getDashboardPanels() {
      return await testSubjects.findAll('embeddablePanel');
    }

    public async addVisualizations(visualizations: string[]) {
      await dashboardAddPanel.addVisualizations(visualizations);
    }

    public async setSaveAsNewCheckBox(checked: boolean) {
      log.debug('saveAsNewCheckbox: ' + checked);
      let saveAsNewCheckbox = await testSubjects.find('saveAsNewCheckbox');
      const isAlreadyChecked = (await saveAsNewCheckbox.getAttribute('aria-checked')) === 'true';
      if (isAlreadyChecked !== checked) {
        log.debug('Flipping save as new checkbox');
        saveAsNewCheckbox = await testSubjects.find('saveAsNewCheckbox');
        await retry.try(() => saveAsNewCheckbox.click());
      }
    }

    public async setStoreTimeWithDashboard(checked: boolean) {
      log.debug('Storing time with dashboard: ' + checked);
      let storeTimeCheckbox = await testSubjects.find('storeTimeWithDashboard');
      const isAlreadyChecked = (await storeTimeCheckbox.getAttribute('aria-checked')) === 'true';
      if (isAlreadyChecked !== checked) {
        log.debug('Flipping store time checkbox');
        storeTimeCheckbox = await testSubjects.find('storeTimeWithDashboard');
        await retry.try(() => storeTimeCheckbox.click());
      }
    }

    public async getSharedItemsCount() {
      log.debug('in getSharedItemsCount');
      const attributeName = 'data-shared-items-count';
      const element = await find.byCssSelector(`[${attributeName}]`);
      if (element) {
        return await element.getAttribute(attributeName);
      }

      throw new Error('no element');
    }

    public async waitForRenderComplete() {
      log.debug('waitForRenderComplete');
      const count = await this.getSharedItemsCount();
      // eslint-disable-next-line radix
      await renderable.waitForRender(parseInt(count));
    }

    public async getSharedContainerData() {
      log.debug('getSharedContainerData');
      const sharedContainer = await find.byCssSelector('[data-shared-items-container]');
      return {
        title: await sharedContainer.getAttribute('data-title'),
        description: await sharedContainer.getAttribute('data-description'),
        count: await sharedContainer.getAttribute('data-shared-items-count'),
      };
    }

    public async getPanelSharedItemData() {
      log.debug('in getPanelSharedItemData');
      const sharedItemscontainer = await find.byCssSelector('[data-shared-items-count]');
      const $ = await sharedItemscontainer.parseDomContent();
      return $('[data-shared-item]')
        .toArray()
        .map((item) => {
          return {
            title: $(item).attr('data-title'),
            description: $(item).attr('data-description'),
          };
        });
    }

    public async checkHideTitle() {
      log.debug('ensure that you can click on hide title checkbox');
      await this.openOptions();
      return await testSubjects.click('dashboardPanelTitlesCheckbox');
    }

    public async expectMissingSaveOption() {
      await testSubjects.missingOrFail('dashboardSaveMenuItem');
    }

    public async expectMissingQuickSaveOption() {
      await testSubjects.missingOrFail('dashboardQuickSaveMenuItem');
    }
    public async expectExistsQuickSaveOption() {
      await testSubjects.existOrFail('dashboardQuickSaveMenuItem');
    }

    public async getNotLoadedVisualizations(vizList: string[]) {
      const checkList = [];
      for (const name of vizList) {
        const isPresent = await testSubjects.exists(
          `embeddablePanelHeading-${name.replace(/\s+/g, '')}`,
          { timeout: 10000 }
        );
        checkList.push({ name, isPresent });
      }

      return checkList.filter((viz) => viz.isPresent === false).map((viz) => viz.name);
    }

    public async getPanelDrilldownCount(panelIndex = 0): Promise<number> {
      log.debug('getPanelDrilldownCount');
      const panel = (await this.getDashboardPanels())[panelIndex];
      try {
        const count = await panel.findByTestSubject(
          'embeddablePanelNotification-ACTION_PANEL_NOTIFICATIONS'
        );
        return Number.parseInt(await count.getVisibleText(), 10);
      } catch (e) {
        // if not found then this is 0 (we don't show badge with 0)
        return 0;
      }
    }

    public async getPanelChartDebugState(panelIndex: number) {
      return await elasticChart.getChartDebugData(undefined, panelIndex);
    }
  }

  return new DashboardPage();
}
