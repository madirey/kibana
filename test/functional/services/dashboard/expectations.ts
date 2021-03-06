/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { WebElementWrapper } from '../lib/web_element_wrapper';

export function DashboardExpectProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const filterBar = getService('filterBar');
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'visChart']);
  const findTimeout = 2500;

  return new (class DashboardExpect {
    async panelCount(expectedCount: number) {
      log.debug(`DashboardExpect.panelCount(${expectedCount})`);
      await retry.try(async () => {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.be(expectedCount);
      });
    }

    async visualizationsArePresent(vizList: string[]) {
      log.debug('Checking all visualisations are present on dashsboard');
      let notLoaded = await PageObjects.dashboard.getNotLoadedVisualizations(vizList);
      // TODO: Determine issue occasionally preventing 'geo map' from loading
      notLoaded = notLoaded.filter((x) => x !== 'Rendering Test: geo map');
      expect(notLoaded).to.be.empty();
    }

    async selectedLegendColorCount(color: string, expectedCount: number) {
      log.debug(`DashboardExpect.selectedLegendColorCount(${color}, ${expectedCount})`);
      await retry.try(async () => {
        const selectedLegendColor = await testSubjects.findAll(
          `legendSelectedColor-${color}`,
          findTimeout
        );
        expect(selectedLegendColor.length).to.be(expectedCount);
      });
    }

    async docTableFieldCount(expectedCount: number) {
      log.debug(`DashboardExpect.docTableFieldCount(${expectedCount})`);
      await retry.try(async () => {
        const docTableCells = await testSubjects.findAll('docTableField', findTimeout);
        expect(docTableCells.length).to.be(expectedCount);
      });
    }

    async fieldSuggestions(expectedFields: string[]) {
      log.debug(`DashboardExpect.fieldSuggestions(${expectedFields})`);
      const fields = await filterBar.getFilterEditorFields();
      expectedFields.forEach((expectedField) => {
        expect(fields).to.contain(expectedField);
      });
    }

    async legendValuesToExist(legendValues: string[]) {
      log.debug(`DashboardExpect.legendValuesToExist(${legendValues})`);
      await Promise.all(
        legendValues.map(async (legend) => {
          await retry.try(async () => {
            const legendValueExists = await testSubjects.exists(`legend-${legend}`);
            expect(legendValueExists).to.be(true);
          });
        })
      );
    }

    async textWithinElementsExists(texts: string[], getElementsFn: Function) {
      log.debug(`DashboardExpect.textWithinElementsExists(${texts})`);
      await retry.try(async () => {
        const elements: WebElementWrapper[] = await getElementsFn();
        const elementTexts: string[] = [];
        await Promise.all(
          elements.map(async (element) => {
            elementTexts.push(await element.getVisibleText());
          })
        );
        log.debug(`Found ${elements.length} elements with values: ${JSON.stringify(elementTexts)}`);
        texts.forEach((value) => {
          const indexOfValue = elementTexts.indexOf(value);
          expect(indexOfValue).to.be.greaterThan(-1);
          elementTexts.splice(indexOfValue, 1);
        });
      });
    }

    async textWithinTestSubjectsExists(texts: string[], selector: string) {
      log.debug(`DashboardExpect.textWithinTestSubjectsExists(${texts})`);
      log.debug(`textWithinTestSubjectsExists:(${JSON.stringify(texts)},${selector})`);
      await this.textWithinElementsExists(texts, async () => await testSubjects.findAll(selector));
    }

    async textWithinCssElementExists(texts: string[], selector: string) {
      log.debug(`DashboardExpect.textWithinCssElementExists(${texts})`);
      log.debug(`textWithinCssElementExists:(${JSON.stringify(texts)},${selector})`);
      await this.textWithinElementsExists(texts, async () => await find.allByCssSelector(selector));
    }

    async textWithinElementsDoNotExist(texts: string[], getElementsFn: Function) {
      log.debug(`DashboardExpect.textWithinElementsDoNotExist(${texts})`);
      await retry.try(async () => {
        const elements: WebElementWrapper[] = await getElementsFn();
        const elementTexts: string[] = [];
        await Promise.all(
          elements.map(async (element) => {
            elementTexts.push(await element.getVisibleText());
          })
        );
        log.debug(`Found ${elements.length} elements with values: ${JSON.stringify(elementTexts)}`);
        texts.forEach((value) => {
          const indexOfValue = elementTexts.indexOf(value);
          expect(indexOfValue).to.be(-1);
        });
      });
    }

    async textWithinCssElementDoNotExist(texts: string[], selector: string) {
      log.debug(`textWithinCssElementExists:(${JSON.stringify(texts)},${selector})`);
      await this.textWithinElementsDoNotExist(
        texts,
        async () => await find.allByCssSelector(selector)
      );
    }

    async timelionLegendCount(expectedCount: number) {
      log.debug(`DashboardExpect.timelionLegendCount(${expectedCount})`);
      await retry.try(async () => {
        const flotLegendLabels = await testSubjects.findAll('flotLegendLabel', findTimeout);
        expect(flotLegendLabels.length).to.be(expectedCount);
      });
    }

    async emptyTagCloudFound() {
      log.debug(`DashboardExpect.emptyTagCloudFound()`);
      const tagCloudVisualizations = await testSubjects.findAll('tagCloudVisualization');
      const tagCloudsHaveContent = await Promise.all(
        tagCloudVisualizations.map(async (tagCloud) => {
          return await find.descendantExistsByCssSelector('text', tagCloud);
        })
      );
      expect(tagCloudsHaveContent.indexOf(false)).to.be.greaterThan(-1);
    }

    async tagCloudWithValuesFound(values: string[]) {
      log.debug(`DashboardExpect.tagCloudWithValuesFound(${values})`);
      const tagCloudVisualizations = await testSubjects.findAll('tagCloudVisualization');
      const matches = await Promise.all(
        tagCloudVisualizations.map(async (tagCloud) => {
          for (let i = 0; i < values.length; i++) {
            const valueExists = await testSubjects.descendantExists(values[i], tagCloud);
            if (!valueExists) {
              return false;
            }
          }
          return true;
        })
      );
      expect(matches.indexOf(true)).to.be.greaterThan(-1);
    }

    async goalAndGuageLabelsExist(labels: string[]) {
      log.debug(`DashboardExpect.goalAndGuageLabelsExist(${labels})`);
      await this.textWithinCssElementExists(labels, '.chart-label');
    }

    async metricValuesExist(values: string[]) {
      log.debug(`DashboardExpect.metricValuesExist(${values})`);
      await this.textWithinCssElementExists(values, '.mtrVis__value');
    }

    async tsvbMetricValuesExist(values: string[]) {
      log.debug(`DashboardExpect.tsvbMetricValuesExist(${values})`);
      await this.textWithinTestSubjectsExists(values, 'tsvbMetricValue');
    }

    async tsvbTopNValuesExist(values: string[]) {
      log.debug(`DashboardExpect.tsvbTopNValuesExist(${values})`);
      await this.textWithinTestSubjectsExists(values, 'tsvbTopNValue');
    }

    async vegaTextsExist(values: string[]) {
      log.debug(`DashboardExpect.vegaTextsExist(${values})`);
      await this.textWithinCssElementExists(values, '.vgaVis__view text');
    }

    async vegaTextsDoNotExist(values: string[]) {
      log.debug(`DashboardExpect.vegaTextsDoNotExist(${values})`);
      await this.textWithinCssElementDoNotExist(values, '.vgaVis__view text');
    }

    async tsvbMarkdownWithValuesExists(values: string[]) {
      log.debug(`DashboardExpect.tsvbMarkdownWithValuesExists(${values})`);
      await this.textWithinTestSubjectsExists(values, 'tsvbMarkdown');
    }

    async markdownWithValuesExists(values: string[]) {
      log.debug(`DashboardExpect.markdownWithValuesExists(${values})`);
      await this.textWithinTestSubjectsExists(values, 'markdownBody');
    }

    async savedSearchRowCount(expectedMinCount: number) {
      log.debug(`DashboardExpect.savedSearchRowCount(${expectedMinCount})`);
      await retry.try(async () => {
        const savedSearchRows = await testSubjects.findAll(
          'docTableExpandToggleColumn',
          findTimeout
        );
        expect(savedSearchRows.length).to.be.above(expectedMinCount);
      });
    }

    async dataTableRowCount(expectedCount: number) {
      log.debug(`DashboardExpect.dataTableRowCount(${expectedCount})`);
      await retry.try(async () => {
        const dataTableRows = await PageObjects.visChart.getTableVisContent();
        expect(dataTableRows.length).to.be(expectedCount);
      });
    }

    async dataTableNoResult() {
      log.debug(`DashboardExpect.dataTableNoResult`);
      await retry.try(async () => {
        await PageObjects.visChart.getTableVisNoResult();
      });
    }

    async seriesElementCount(expectedCount: number) {
      log.debug(`DashboardExpect.seriesElementCount(${expectedCount})`);
      await retry.try(async () => {
        const seriesElements = await find.allByCssSelector('.series', findTimeout);
        expect(seriesElements.length).to.be(expectedCount);
      });
    }

    async inputControlItemCount(expectedCount: number) {
      log.debug(`DashboardExpect.inputControlItemCount(${expectedCount})`);
      await retry.try(async () => {
        const inputControlItems = await testSubjects.findAll('inputControlItem');
        expect(inputControlItems.length).to.be(expectedCount);
      });
    }

    async lineChartPointsCount(expectedCount: number) {
      log.debug(`DashboardExpect.lineChartPointsCount(${expectedCount})`);
      await retry.try(async () => {
        const points = await find.allByCssSelector('.points', findTimeout);
        expect(points.length).to.be(expectedCount);
      });
    }

    async tsvbTableCellCount(expectedCount: number) {
      log.debug(`DashboardExpect.tsvbTableCellCount(${expectedCount})`);
      await retry.try(async () => {
        const tableCells = await testSubjects.findAll('tvbTableVis__value', findTimeout);
        expect(tableCells.length).to.be(expectedCount);
      });
    }
  })();
}
