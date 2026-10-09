Feature: The sheet's tab host

  Scenario: The sheet opens on the Character sheet
    Given a saved character
    When the Character sheet tab is opened
    Then the character's name, the mode toggle, the save status and the resources row are shown
    And the Attributes and Abilities cards are shown

  Scenario: An unknown tab name falls back to the Character sheet
    Given a saved character
    When its sheet is opened with the tab name "nonsense"
    Then the Character sheet is shown
    And no error is shown

  Scenario: The Character sheet still works as before
    Given a character in edit mode
    When the player raises Strength to 4 and returns to play mode
    Then the sheet shows Strength 4 and it is still 4 after a reload

  Scenario: A wound re-announces the selected pool
    Given a character in play mode with Strength and Brawl selected
    When the player marks a Hurt wound
    Then the Selected pool is announced with the wound subtracted

  Scenario: A missing character is still reported
    Given no character is saved with the address's id
    When the sheet is opened with the tab name "combat"
    Then "Character not found" is shown
