import { system, world } from "@minecraft/server";
import type { Vector3 } from "@minecraft/server";

const MONEY_ITEM = "dongha_n:money";
const PREFIX = "!수표";
const SCOREBOARD_KEY = "money";
const MONEY_REG = /^(!수표\s)[0-9]+$/;

world.afterEvents.worldInitialize.subscribe((param) => {
  world.sendMessage(`${Date().toString()} money init`);

  const scoreboard = world.scoreboard.getObjective(SCOREBOARD_KEY);
  if (!scoreboard) {
    const money = world.scoreboard.addObjective(SCOREBOARD_KEY, SCOREBOARD_KEY);
    world.getPlayers().map((player) => {
      money.addScore(player, 0);
    });
  }
});

world.afterEvents.playerJoin.subscribe((player) => {
  const scoreboard = world.scoreboard.getObjective(SCOREBOARD_KEY)!;
  if (!scoreboard.hasParticipant(player.playerName)) {
    scoreboard.addScore(player.playerName, 0);
  }
});

world.afterEvents.itemUse.subscribe((item) => {
  if (MONEY_ITEM === item.itemStack.typeId) {
    const money = item.itemStack.getLore();
    console.warn(item.source.name, item.source.nameTag);

    if (money.length !== 1) {
      item.source.sendMessage("올바르지 않은 아이템입니다.");
    }
    const value = parseInt(money[0]);
    const curMoney = world.scoreboard.getObjective(SCOREBOARD_KEY)!.addScore(item.source, value);
    item.source.dimension.runCommand(
      `/replaceitem entity "${item.source.name}" slot.hotbar ${item.source.selectedSlot} air`
    );
    item.source.sendMessage(`현재 소지금: ${curMoney}원`);
  }
});

world.afterEvents.chatSend.subscribe(({ message, sender }) => {
  if (message.startsWith(PREFIX)) {
    if (!MONEY_REG.test(message)) {
      sender.sendMessage("!수표 <숫자: number> 형태로 보내주세요");
      return;
    }
    const wrap = sender.getComponent("minecraft:inventory");
    if (!wrap?.container) {
      sender.sendMessage("sorry its error");
    }
    const selectedItem = wrap?.container.getItem(sender.selectedSlot);
    if (selectedItem) {
      sender.sendMessage("손에 아이템을 비워주세요");
      return;
    }
    const value = parseInt(message.slice(4));
    const scoreboard = world.scoreboard.getObjective(SCOREBOARD_KEY)!;
    const hasMoney = scoreboard.getScore(sender)!;
    if (hasMoney < value) {
      sender.sendMessage(`현재 소지금이 부족합니다. 소지금: ${hasMoney}`);
      return;
    }
    scoreboard.addScore(sender, -value);
    sender.dimension.runCommand(`/give "${sender.name}" ${MONEY_ITEM} 1`);
    const money = wrap?.container.getItem(sender.selectedSlot)!;

    money.nameTag = `${value}원`;
    money.setLore([`${value}원`]);
    wrap?.container.setItem(sender.selectedSlot, money);
  }
});

system.runInterval(() => {
  const scoreboard = world.scoreboard.getObjective(SCOREBOARD_KEY)!;
  world.getAllPlayers().map((player) => {
    player.onScreenDisplay.setActionBar(`소지금: ${scoreboard.getScore(player)}`);
  });
}, 20);
